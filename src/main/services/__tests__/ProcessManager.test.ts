import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { ProcessManager, ProcessError, TerminalConfig } from '../ProcessManager'

// Mock child_process module
vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

const mockSpawn = spawn as any

// Mock child process
class MockChildProcess extends EventEmitter {
  pid: number
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  stdin = {
    write: vi.fn()
  }
  kill = vi.fn()

  constructor(pid: number = 1234) {
    super()
    this.pid = pid
  }

  simulateData(stream: 'stdout' | 'stderr', data: string) {
    this[stream].emit('data', Buffer.from(data))
  }

  simulateClose(code: number, signal?: string) {
    this.emit('close', code, signal)
  }

  simulateError(error: Error) {
    this.emit('error', error)
  }
}

describe('ProcessManager', () => {
  let processManager: ProcessManager
  let mockChildProcess: MockChildProcess

  beforeEach(() => {
    processManager = new ProcessManager()
    mockChildProcess = new MockChildProcess()
    mockSpawn.mockReturnValue(mockChildProcess)
    vi.clearAllMocks()
  })

  afterEach(() => {
    processManager.cleanup()
  })

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      const command = 'echo'
      const args = ['hello']
      const expectedOutput = 'hello\n'

      // Start the command execution
      const resultPromise = processManager.executeCommand(command, args)

      // Simulate process output and completion
      setTimeout(() => {
        mockChildProcess.simulateData('stdout', expectedOutput)
        mockChildProcess.simulateClose(0)
      }, 10)

      const result = await resultPromise

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('hello')
      expect(result.exitCode).toBe(0)
      expect(result.duration).toBeGreaterThan(0)
      expect(mockSpawn).toHaveBeenCalledWith(command, args, expect.objectContaining({
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      }))
    })

    it('should handle command failure', async () => {
      const command = 'nonexistent'
      const args = []

      const resultPromise = processManager.executeCommand(command, args)

      setTimeout(() => {
        mockChildProcess.simulateData('stderr', 'command not found')
        mockChildProcess.simulateClose(1)
      }, 10)

      const result = await resultPromise

      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('command not found')
    })

    it('should handle spawn errors', async () => {
      const error = new Error('spawn failed')
      error.code = 'ENOENT'
      
      const resultPromise = processManager.executeCommand('badcommand')

      setTimeout(() => {
        mockChildProcess.simulateError(error)
      }, 10)

      await expect(resultPromise).rejects.toThrow(ProcessError)
    })

    it('should track running processes', async () => {
      const resultPromise = processManager.executeCommand('echo', ['test'])

      // Check that process is tracked
      const runningProcesses = processManager.getRunningProcesses()
      expect(runningProcesses).toHaveLength(1)
      expect(runningProcesses[0].command).toBe('echo')
      expect(runningProcesses[0].status).toBe('running')

      // Complete the process
      setTimeout(() => {
        mockChildProcess.simulateClose(0)
      }, 10)

      await resultPromise

      // Check that process status is updated
      const completedProcesses = processManager.getRunningProcesses()
      expect(completedProcesses[0].status).toBe('completed')
    })

    it('should handle custom working directory', async () => {
      const customCwd = '/custom/path'
      const resultPromise = processManager.executeCommand('pwd', [], customCwd)

      setTimeout(() => {
        mockChildProcess.simulateClose(0)
      }, 10)

      await resultPromise

      expect(mockSpawn).toHaveBeenCalledWith('pwd', [], expect.objectContaining({
        cwd: customCwd
      }))
    })
  })

  describe('startTerminal', () => {
    it('should start terminal session successfully', () => {
      const config: TerminalConfig = {
        cwd: '/test/path',
        shell: '/bin/bash'
      }

      const session = processManager.startTerminal(config)

      expect(session).toBeDefined()
      expect(session.id).toMatch(/^terminal-\d+$/)
      expect(session.pid).toBe(mockChildProcess.pid)
      expect(session.cwd).toBe(config.cwd)
      expect(mockSpawn).toHaveBeenCalledWith('/bin/bash', [], expect.objectContaining({
        cwd: config.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      }))
    })

    it('should handle terminal session data events', (done) => {
      const session = processManager.startTerminal({ cwd: '/test' })
      const testData = 'test output'

      session.on('data', (data) => {
        expect(data).toBe(testData)
        done()
      })

      mockChildProcess.simulateData('stdout', testData)
    })

    it('should handle terminal session exit', (done) => {
      const session = processManager.startTerminal({ cwd: '/test' })

      session.on('exit', ({ code, signal }) => {
        expect(code).toBe(0)
        expect(signal).toBeNull()
        expect(session.isAlive()).toBe(false)
        done()
      })

      mockChildProcess.simulateClose(0, null)
    })

    it('should allow writing to terminal', () => {
      const session = processManager.startTerminal({ cwd: '/test' })
      const command = 'ls -la\n'

      session.write(command)

      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(command)
    })

    it('should track terminal sessions', () => {
      const session1 = processManager.startTerminal({ cwd: '/test1' })
      const session2 = processManager.startTerminal({ cwd: '/test2' })

      const sessions = processManager.getTerminalSessions()
      expect(sessions).toHaveLength(2)
      expect(sessions).toContain(session1)
      expect(sessions).toContain(session2)

      const retrievedSession = processManager.getTerminalSession(session1.id)
      expect(retrievedSession).toBe(session1)
    })
  })

  describe('killProcess', () => {
    it('should kill a running process', async () => {
      // Mock process.kill
      const originalKill = process.kill
      process.kill = vi.fn()

      // Start a process to track it
      const resultPromise = processManager.executeCommand('sleep', ['10'])
      
      // Wait for process to be tracked
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const runningProcesses = processManager.getRunningProcesses()
      expect(runningProcesses).toHaveLength(1)
      
      const pid = runningProcesses[0].pid

      await processManager.killProcess(pid)

      expect(process.kill).toHaveBeenCalledWith(pid, 'SIGTERM')

      // Restore original process.kill
      process.kill = originalKill

      // Clean up the promise
      setTimeout(() => mockChildProcess.simulateClose(1, 'SIGTERM'), 10)
      await resultPromise.catch(() => {}) // Ignore the error from killed process
    })

    it('should throw error for non-existent process', async () => {
      await expect(processManager.killProcess(99999)).rejects.toThrow(ProcessError)
    })
  })

  describe('executeInTerminal', () => {
    it('should execute command in terminal session', () => {
      const session = processManager.startTerminal({ cwd: '/test' })
      const command = 'echo hello'

      processManager.executeInTerminal(session.id, command)

      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(command + '\n')
    })

    it('should throw error for non-existent terminal', () => {
      expect(() => {
        processManager.executeInTerminal('nonexistent', 'echo test')
      }).toThrow(ProcessError)
    })
  })

  describe('isCommandAvailable', () => {
    it('should return true for available command', async () => {
      const resultPromise = processManager.isCommandAvailable('node')

      setTimeout(() => {
        mockChildProcess.simulateData('stdout', '/usr/bin/node')
        mockChildProcess.simulateClose(0)
      }, 10)

      const result = await resultPromise
      expect(result).toBe(true)
    })

    it('should return false for unavailable command', async () => {
      const resultPromise = processManager.isCommandAvailable('nonexistent')

      setTimeout(() => {
        mockChildProcess.simulateClose(1)
      }, 10)

      const result = await resultPromise
      expect(result).toBe(false)
    })
  })

  describe('getSystemInfo', () => {
    it('should return system information', async () => {
      // Mock the shell detection
      const availableShellsPromise = processManager.getSystemInfo()

      // Simulate shell detection commands
      setTimeout(() => {
        mockChildProcess.simulateClose(0) // First shell check
      }, 10)

      const systemInfo = await availableShellsPromise

      expect(systemInfo.platform).toBe(process.platform)
      expect(systemInfo.arch).toBe(process.arch)
      expect(systemInfo.nodeVersion).toBe(process.version)
      expect(Array.isArray(systemInfo.availableShells)).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('should cleanup all processes and sessions', () => {
      const session1 = processManager.startTerminal({ cwd: '/test1' })
      const session2 = processManager.startTerminal({ cwd: '/test2' })

      expect(processManager.getTerminalSessions()).toHaveLength(2)
      expect(processManager.getRunningProcesses()).toHaveLength(2)

      processManager.cleanup()

      expect(processManager.getTerminalSessions()).toHaveLength(0)
      expect(processManager.getRunningProcesses()).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    it('should handle ENOENT error with appropriate message', async () => {
      const error = new Error('Command not found')
      error.code = 'ENOENT'

      const resultPromise = processManager.executeCommand('badcommand')

      setTimeout(() => {
        mockChildProcess.simulateError(error)
      }, 10)

      try {
        await resultPromise
      } catch (err) {
        expect(err).toBeInstanceOf(ProcessError)
        expect(err.message).toContain('Command not found')
        expect(err.code).toBe('ENOENT')
        expect(err.suggestedActions).toContain('Check that the command is installed and in your PATH')
      }
    })

    it('should handle EACCES error', async () => {
      const error = new Error('Permission denied')
      error.code = 'EACCES'

      const resultPromise = processManager.executeCommand('restricted')

      setTimeout(() => {
        mockChildProcess.simulateError(error)
      }, 10)

      try {
        await resultPromise
      } catch (err) {
        expect(err).toBeInstanceOf(ProcessError)
        expect(err.message).toContain('Permission denied')
        expect(err.code).toBe('EACCES')
      }
    })

    it('should handle spawn failure', () => {
      mockChildProcess.pid = undefined as any

      expect(() => {
        processManager.startTerminal({ cwd: '/test' })
      }).toThrow(ProcessError)
    })
  })

  describe('terminal session lifecycle', () => {
    it('should handle terminal session kill', () => {
      const session = processManager.startTerminal({ cwd: '/test' })
      
      expect(session.isAlive()).toBe(true)
      
      session.kill()
      
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('should handle terminal resize events', (done) => {
      const session = processManager.startTerminal({ cwd: '/test' })
      
      session.on('resize', ({ cols, rows }) => {
        expect(cols).toBe(80)
        expect(rows).toBe(24)
        done()
      })
      
      session.resize(80, 24)
    })
  })
})