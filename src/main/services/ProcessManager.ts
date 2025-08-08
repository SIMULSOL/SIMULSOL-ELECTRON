import { spawn, ChildProcess, SpawnOptions } from 'child_process'
import { EventEmitter } from 'events'
import { join } from 'path'

export interface ProcessResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
  signal: string | null
  duration: number
}

export interface ProcessInfo {
  pid: number
  command: string
  args: string[]
  cwd: string
  startTime: Date
  status: 'running' | 'completed' | 'failed' | 'killed'
}

export interface TerminalSession extends EventEmitter {
  id: string
  pid: number
  cwd: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  isAlive(): boolean
}

export interface TerminalConfig {
  cwd: string
  env?: Record<string, string>
  shell?: string
  cols?: number
  rows?: number
}

export class ProcessError extends Error {
  constructor(
    message: string,
    public code: string,
    public command?: string,
    public suggestedActions: string[] = []
  ) {
    super(message)
    this.name = 'ProcessError'
  }
}

class TerminalSessionImpl extends EventEmitter implements TerminalSession {
  public readonly id: string
  public readonly pid: number
  public readonly cwd: string
  private process: ChildProcess
  private startTime: Date
  private _isAlive: boolean = true

  constructor(id: string, process: ChildProcess, cwd: string, private sendToRenderer?: (channel: string, data: any) => void) {
    super()
    this.id = id
    this.pid = process.pid!
    this.cwd = cwd
    this.process = process
    this.startTime = new Date()

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.process.stdout?.on('data', (data) => {
      const output = data.toString()
      this.emit('data', output)
      
      // Send to renderer process if callback is provided
      if (this.sendToRenderer) {
        this.sendToRenderer('event:terminal-output', {
          terminalId: this.id,
          data: output
        })
      }
    })

    this.process.stderr?.on('data', (data) => {
      const output = data.toString()
      this.emit('data', output)
      
      // Send to renderer process if callback is provided
      if (this.sendToRenderer) {
        this.sendToRenderer('event:terminal-output', {
          terminalId: this.id,
          data: output
        })
      }
    })

    this.process.on('exit', (code, signal) => {
      this._isAlive = false
      this.emit('exit', { code, signal })
    })

    this.process.on('error', (error) => {
      this._isAlive = false
      this.emit('error', error)
    })
  }

  write(data: string): void {
    if (this._isAlive && this.process.stdin) {
      this.process.stdin.write(data)
    }
  }

  resize(cols: number, rows: number): void {
    // Note: This would require pty support for true terminal resizing
    // For now, we emit a resize event that can be handled by the terminal emulator
    this.emit('resize', { cols, rows })
  }

  kill(): void {
    if (this._isAlive) {
      this.process.kill('SIGTERM')
      
      // Force kill after 5 seconds if still alive
      setTimeout(() => {
        if (this._isAlive) {
          this.process.kill('SIGKILL')
        }
      }, 5000)
    }
  }

  isAlive(): boolean {
    return this._isAlive
  }
}

export class ProcessManager {
  private runningProcesses: Map<number, ProcessInfo> = new Map()
  private terminalSessions: Map<string, TerminalSession> = new Map()
  private nextTerminalId = 1
  private sendToRenderer?: (channel: string, data: any) => void

  constructor(sendToRenderer?: (channel: string, data: any) => void) {
    this.sendToRenderer = sendToRenderer
  }

  /**
   * Executes a command and returns the result
   */
  async executeCommand(
    command: string,
    args: string[] = [],
    cwd: string = process.cwd(),
    options: Partial<SpawnOptions> = {}
  ): Promise<ProcessResult> {
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      try {
        const childProcess = spawn(command, args, {
          cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: process.platform === 'win32',
          ...options
        })

        if (!childProcess.pid) {
          throw new ProcessError(
            `Failed to start process: ${command}`,
            'SPAWN_FAILED',
            command,
            [
              'Check that the command exists and is executable',
              'Verify the working directory is accessible',
              'Ensure you have permission to execute the command'
            ]
          )
        }

        // Track the process
        const processInfo: ProcessInfo = {
          pid: childProcess.pid,
          command,
          args,
          cwd,
          startTime: new Date(),
          status: 'running'
        }
        this.runningProcesses.set(childProcess.pid, processInfo)

        let stdout = ''
        let stderr = ''

        childProcess.stdout?.on('data', (data) => {
          stdout += data.toString()
        })

        childProcess.stderr?.on('data', (data) => {
          stderr += data.toString()
        })

        childProcess.on('close', (code, signal) => {
          const duration = Date.now() - startTime
          const processInfo = this.runningProcesses.get(childProcess.pid!)
          
          if (processInfo) {
            processInfo.status = code === 0 ? 'completed' : 'failed'
            // Keep completed processes for a short time for reference
            setTimeout(() => {
              this.runningProcesses.delete(childProcess.pid!)
            }, 30000)
          }

          const result: ProcessResult = {
            success: code === 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            signal,
            duration
          }

          resolve(result)
        })

        childProcess.on('error', (error) => {
          const processInfo = this.runningProcesses.get(childProcess.pid!)
          if (processInfo) {
            processInfo.status = 'failed'
          }

          reject(this.handleProcessError(error, command, [
            'Check that the command exists in your PATH',
            'Verify you have permission to execute the command',
            'Ensure all required dependencies are installed'
          ]))
        })

        // Handle process timeout (optional)
        const timeout = options.timeout
        if (timeout && timeout > 0) {
          setTimeout(() => {
            if (childProcess.pid && this.runningProcesses.has(childProcess.pid)) {
              childProcess.kill('SIGTERM')
              setTimeout(() => {
                if (childProcess.pid && this.runningProcesses.has(childProcess.pid)) {
                  childProcess.kill('SIGKILL')
                }
              }, 5000)
            }
          }, timeout)
        }

      } catch (error) {
        reject(this.handleProcessError(error, command))
      }
    })
  }

  /**
   * Starts a new terminal session
   */
  startTerminal(config: TerminalConfig): TerminalSession {
    const terminalId = `terminal-${this.nextTerminalId++}`
    
    try {
      // Determine shell based on platform
      const shell = config.shell || this.getDefaultShell()
      
      const childProcess = spawn(shell, [], {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      })

      if (!childProcess.pid) {
        throw new ProcessError(
          'Failed to start terminal session',
          'TERMINAL_SPAWN_FAILED',
          shell,
          [
            'Check that the shell is installed and accessible',
            'Verify the working directory exists',
            'Ensure you have permission to start a shell'
          ]
        )
      }

      const session = new TerminalSessionImpl(terminalId, childProcess, config.cwd, this.sendToRenderer)
      this.terminalSessions.set(terminalId, session)

      // Track as a running process
      const processInfo: ProcessInfo = {
        pid: childProcess.pid,
        command: shell,
        args: [],
        cwd: config.cwd,
        startTime: new Date(),
        status: 'running'
      }
      this.runningProcesses.set(childProcess.pid, processInfo)

      // Clean up when session ends
      session.on('exit', () => {
        this.terminalSessions.delete(terminalId)
        this.runningProcesses.delete(childProcess.pid!)
      })

      return session
    } catch (error) {
      throw this.handleProcessError(error, config.shell || 'shell', [
        'Check that the shell is installed',
        'Verify the working directory is accessible',
        'Ensure you have permission to start a terminal'
      ])
    }
  }

  /**
   * Kills a process by PID
   */
  async killProcess(pid: number): Promise<void> {
    try {
      const processInfo = this.runningProcesses.get(pid)
      if (!processInfo) {
        throw new ProcessError(
          `Process with PID ${pid} not found`,
          'PROCESS_NOT_FOUND',
          undefined,
          ['Check that the process ID is correct', 'The process may have already terminated']
        )
      }

      // Try graceful termination first
      process.kill(pid, 'SIGTERM')
      
      // Wait a bit, then force kill if still running
      setTimeout(() => {
        try {
          if (this.runningProcesses.has(pid)) {
            process.kill(pid, 'SIGKILL')
          }
        } catch {
          // Process already terminated
        }
      }, 5000)

      processInfo.status = 'killed'
      
      // Remove from tracking after a delay
      setTimeout(() => {
        this.runningProcesses.delete(pid)
      }, 1000)

    } catch (error) {
      if (error instanceof ProcessError) {
        throw error
      }
      
      throw this.handleProcessError(error, `kill ${pid}`, [
        'Check that the process exists',
        'Ensure you have permission to kill the process',
        'The process may have already terminated'
      ])
    }
  }

  /**
   * Gets information about all running processes
   */
  getRunningProcesses(): ProcessInfo[] {
    return Array.from(this.runningProcesses.values())
  }

  /**
   * Gets a specific terminal session by ID
   */
  getTerminalSession(id: string): TerminalSession | undefined {
    return this.terminalSessions.get(id)
  }

  /**
   * Gets all active terminal sessions
   */
  getTerminalSessions(): TerminalSession[] {
    return Array.from(this.terminalSessions.values())
  }

  /**
   * Kills all running processes and terminal sessions
   */
  cleanup(): void {
    // Kill all terminal sessions
    for (const session of this.terminalSessions.values()) {
      session.kill()
    }
    this.terminalSessions.clear()

    // Kill all other running processes
    for (const processInfo of this.runningProcesses.values()) {
      try {
        process.kill(processInfo.pid, 'SIGTERM')
      } catch {
        // Process may already be terminated
      }
    }
    this.runningProcesses.clear()
  }

  /**
   * Executes a command in a specific terminal session
   */
  executeInTerminal(terminalId: string, command: string): void {
    const session = this.terminalSessions.get(terminalId)
    if (!session) {
      throw new ProcessError(
        `Terminal session ${terminalId} not found`,
        'TERMINAL_NOT_FOUND',
        command,
        ['Check that the terminal session ID is correct', 'The terminal may have been closed']
      )
    }

    session.write(command + '\n')
  }

  /**
   * Checks if a command is available in the system PATH
   */
  async isCommandAvailable(command: string): Promise<boolean> {
    try {
      const testCommand = process.platform === 'win32' ? 'where' : 'which'
      const result = await this.executeCommand(testCommand, [command])
      return result.success
    } catch {
      return false
    }
  }

  /**
   * Gets system information about available tools
   */
  async getSystemInfo(): Promise<{
    platform: string
    arch: string
    nodeVersion: string
    availableShells: string[]
  }> {
    const availableShells = await this.detectAvailableShells()
    
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      availableShells
    }
  }

  // Private helper methods

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe'
    } else {
      return process.env.SHELL || '/bin/bash'
    }
  }

  private async detectAvailableShells(): Promise<string[]> {
    const shells = process.platform === 'win32' 
      ? ['cmd.exe', 'powershell.exe', 'pwsh.exe']
      : ['/bin/bash', '/bin/zsh', '/bin/sh', '/bin/fish']

    const availableShells: string[] = []
    
    for (const shell of shells) {
      if (await this.isCommandAvailable(shell)) {
        availableShells.push(shell)
      }
    }

    return availableShells
  }

  private handleProcessError(error: any, command?: string, suggestedActions: string[] = []): ProcessError {
    let message = 'Process operation failed'
    let code = 'UNKNOWN'

    if (error.code) {
      code = error.code
      switch (error.code) {
        case 'ENOENT':
          message = `Command not found: ${command}`
          suggestedActions.push('Check that the command is installed and in your PATH')
          break
        case 'EACCES':
          message = `Permission denied: ${command}`
          suggestedActions.push('Check that you have permission to execute the command')
          break
        case 'EMFILE':
          message = 'Too many open files'
          suggestedActions.push('Close some applications or increase file descriptor limits')
          break
        case 'ENOMEM':
          message = 'Not enough memory to start process'
          suggestedActions.push('Close some applications to free up memory')
          break
        default:
          message = error.message || message
      }
    } else if (error.message) {
      message = error.message
    }

    return new ProcessError(message, code, command, suggestedActions)
  }
}