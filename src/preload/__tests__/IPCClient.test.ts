// Tests for IPC client implementation

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IPCClient } from '../IPCClient'
import { IPC_CHANNELS, createIPCResponse } from '../../shared/types/IPC'

// Mock IpcRenderer
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn()
}

describe('IPCClient', () => {
  let ipcClient: IPCClient

  beforeEach(() => {
    vi.clearAllMocks()
    ipcClient = new IPCClient(mockIpcRenderer as any)
  })

  afterEach(() => {
    ipcClient.removeAllListeners()
  })

  describe('File System Operations', () => {
    it('should read file successfully', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        content: 'test content',
        encoding: 'utf8'
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.fileRead({ path: '/test/file.txt' })

      expect(result.content).toBe('test content')
      expect(result.encoding).toBe('utf8')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        IPC_CHANNELS.FILE_READ,
        expect.objectContaining({
          channel: IPC_CHANNELS.FILE_READ,
          data: { path: '/test/file.txt' }
        })
      )
    })

    it('should write file successfully', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        bytesWritten: 12
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.fileWrite({
        path: '/test/file.txt',
        content: 'test content'
      })

      expect(result.bytesWritten).toBe(12)
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        IPC_CHANNELS.FILE_WRITE,
        expect.objectContaining({
          channel: IPC_CHANNELS.FILE_WRITE,
          data: { path: '/test/file.txt', content: 'test content' }
        })
      )
    })

    it('should check file existence', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        exists: true
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.fileExists({ path: '/test/file.txt' })

      expect(result.exists).toBe(true)
    })

    it('should create directory', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        created: true
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.dirCreate({
        path: '/test/dir',
        recursive: true
      })

      expect(result.created).toBe(true)
    })

    it('should read directory contents', async () => {
      const mockFiles = [
        {
          name: 'file1.txt',
          path: '/test/file1.txt',
          isDirectory: false,
          size: 100,
          modified: new Date()
        },
        {
          name: 'subdir',
          path: '/test/subdir',
          isDirectory: true,
          size: 0,
          modified: new Date()
        }
      ]
      
      const mockResponse = createIPCResponse('test-id', true, {
        files: mockFiles
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.dirRead({ path: '/test' })

      expect(result.files).toEqual(mockFiles)
      expect(result.files).toHaveLength(2)
    })
  })

  describe('Project Operations', () => {
    it('should create project successfully', async () => {
      const mockProject = {
        name: 'test-project',
        path: '/test/project',
        type: 'anchor' as const,
        files: [],
        configuration: { name: 'test-project', version: '1.0.0' },
        dependencies: []
      }
      
      const mockResponse = createIPCResponse('test-id', true, {
        project: mockProject
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.projectCreate({
        template: { name: 'anchor', type: 'anchor' as const, files: [], directories: [] },
        path: '/test/project',
        name: 'test-project'
      })

      expect(result.project).toEqual(mockProject)
    })

    it('should load project successfully', async () => {
      const mockProject = {
        name: 'existing-project',
        path: '/test/existing',
        type: 'native' as const,
        files: [],
        configuration: { name: 'existing-project', version: '1.0.0' },
        dependencies: []
      }
      
      const mockResponse = createIPCResponse('test-id', true, {
        project: mockProject
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.projectLoad({ path: '/test/existing' })

      expect(result.project).toEqual(mockProject)
    })

    it('should validate project', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        valid: true,
        errors: [],
        warnings: ['Missing description in Cargo.toml']
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.projectValidate({ path: '/test/project' })

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
      expect(result.warnings).toHaveLength(1)
    })
  })

  describe('Process Operations', () => {
    it('should execute command successfully', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        pid: 1234,
        exitCode: 0,
        stdout: 'command output',
        stderr: '',
        duration: 1000
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.processExecute({
        command: 'echo',
        args: ['hello'],
        cwd: '/test'
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('command output')
      expect(result.pid).toBe(1234)
    })

    it('should kill process successfully', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        killed: true
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.processKill({ pid: 1234 })

      expect(result.killed).toBe(true)
    })

    it('should list running processes', async () => {
      const mockProcesses = [
        {
          pid: 1234,
          command: 'cargo',
          cwd: '/test/project',
          startTime: new Date()
        }
      ]
      
      const mockResponse = createIPCResponse('test-id', true, {
        processes: mockProcesses
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.processList({})

      expect(result.processes).toEqual(mockProcesses)
    })
  })

  describe('Terminal Operations', () => {
    it('should create terminal session', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        terminalId: 'terminal-1',
        pid: 5678
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.terminalCreate({
        cwd: '/test/project',
        shell: 'bash'
      })

      expect(result.terminalId).toBe('terminal-1')
      expect(result.pid).toBe(5678)
    })

    it('should send input to terminal', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        sent: true
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.terminalInput({
        terminalId: 'terminal-1',
        input: 'ls -la\n'
      })

      expect(result.sent).toBe(true)
    })

    it('should resize terminal', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        resized: true
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.terminalResize({
        terminalId: 'terminal-1',
        cols: 80,
        rows: 24
      })

      expect(result.resized).toBe(true)
    })

    it('should close terminal', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        closed: true
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.terminalClose({
        terminalId: 'terminal-1'
      })

      expect(result.closed).toBe(true)
    })
  })

  describe('Build Operations', () => {
    it('should build program successfully', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        buildId: 'build-123',
        success: true,
        artifacts: [],
        errors: [],
        warnings: [],
        duration: 5000
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.buildProgram({
        projectPath: '/test/project',
        release: true
      })

      expect(result.success).toBe(true)
      expect(result.buildId).toBe('build-123')
      expect(result.duration).toBe(5000)
    })

    it('should clean build artifacts', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        cleaned: true,
        removedFiles: ['target/debug/program.so']
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.buildClean({
        projectPath: '/test/project'
      })

      expect(result.cleaned).toBe(true)
      expect(result.removedFiles).toHaveLength(1)
    })
  })

  describe('Test Operations', () => {
    it('should run tests successfully', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        testId: 'test-123',
        success: true,
        tests: [],
        duration: 3000,
        summary: {
          total: 5,
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 3000
        }
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.testRun({
        projectPath: '/test/project',
        verbose: true
      })

      expect(result.success).toBe(true)
      expect(result.testId).toBe('test-123')
      expect(result.summary.passed).toBe(5)
    })

    it('should cancel test run', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        cancelled: true
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.testCancel({
        testId: 'test-123'
      })

      expect(result.cancelled).toBe(true)
    })
  })

  describe('Workspace Operations', () => {
    it('should save workspace', async () => {
      const mockWorkspace = {
        activeProject: '/test/project',
        openFiles: [],
        layout: { panels: [], sidebarWidth: 250, bottomPanelHeight: 200, isBottomPanelVisible: true, isSidebarVisible: true },
        terminalSessions: [],
        preferences: {
          theme: 'dark' as const,
          fontSize: 14,
          fontFamily: 'Monaco',
          tabSize: 2,
          insertSpaces: true,
          wordWrap: true,
          autoSave: true,
          autoSaveDelay: 1000,
          formatOnSave: true,
          showWhitespace: false,
          showLineNumbers: true
        },
        recentProjects: [],
        lastSaved: new Date(),
        version: '1.0.0'
      }
      
      const mockResponse = createIPCResponse('test-id', true, {
        saved: true,
        path: '/test/project'
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.workspaceSave({
        workspace: mockWorkspace
      })

      expect(result.saved).toBe(true)
      expect(result.path).toBe('/test/project')
    })

    it('should load workspace', async () => {
      const mockWorkspace = {
        activeProject: '/test/project',
        openFiles: [],
        layout: { panels: [], sidebarWidth: 250, bottomPanelHeight: 200, isBottomPanelVisible: true, isSidebarVisible: true },
        terminalSessions: [],
        preferences: {
          theme: 'dark' as const,
          fontSize: 14,
          fontFamily: 'Monaco',
          tabSize: 2,
          insertSpaces: true,
          wordWrap: true,
          autoSave: true,
          autoSaveDelay: 1000,
          formatOnSave: true,
          showWhitespace: false,
          showLineNumbers: true
        },
        recentProjects: [],
        lastSaved: new Date(),
        version: '1.0.0'
      }
      
      const mockResponse = createIPCResponse('test-id', true, {
        workspace: mockWorkspace
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.workspaceLoad({
        path: '/test/project'
      })

      expect(result.workspace).toEqual(mockWorkspace)
    })

    it('should get recent workspaces', async () => {
      const mockWorkspaces = [
        {
          name: 'project1',
          path: '/test/project1',
          lastOpened: new Date(),
          projectType: 'anchor'
        }
      ]
      
      const mockResponse = createIPCResponse('test-id', true, {
        workspaces: mockWorkspaces
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.workspaceRecent({})

      expect(result.workspaces).toEqual(mockWorkspaces)
    })
  })

  describe('Toolchain Operations', () => {
    it('should detect toolchain', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        detected: true,
        version: 'solana-cli 1.14.0',
        path: '/usr/local/bin/solana',
        components: [
          {
            name: 'solana-cli',
            version: '1.14.0',
            path: '/usr/local/bin/solana'
          },
          {
            name: 'rust',
            version: '1.70.0',
            path: '/usr/local/bin/rustc'
          }
        ]
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.toolchainDetect({})

      expect(result.detected).toBe(true)
      expect(result.components).toHaveLength(2)
    })

    it('should validate toolchain', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        valid: true,
        errors: [],
        warnings: []
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const result = await ipcClient.toolchainValidate({})

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('Event Handling', () => {
    it('should register file change event listener', () => {
      const callback = vi.fn()
      const unsubscribe = ipcClient.onFileChanged(callback)

      expect(typeof unsubscribe).toBe('function')
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.EVENT_FILE_CHANGED,
        expect.any(Function)
      )
    })

    it('should register process output event listener', () => {
      const callback = vi.fn()
      const unsubscribe = ipcClient.onProcessOutput(callback)

      expect(typeof unsubscribe).toBe('function')
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.EVENT_PROCESS_OUTPUT,
        expect.any(Function)
      )
    })

    it('should register terminal output event listener', () => {
      const callback = vi.fn()
      const unsubscribe = ipcClient.onTerminalOutput(callback)

      expect(typeof unsubscribe).toBe('function')
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.EVENT_TERMINAL_OUTPUT,
        expect.any(Function)
      )
    })

    it('should remove all event listeners', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      
      ipcClient.onFileChanged(callback1)
      ipcClient.onProcessOutput(callback2)
      
      ipcClient.removeAllListeners()

      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle IPC errors gracefully', async () => {
      const mockError = new Error('IPC communication failed')
      mockIpcRenderer.invoke.mockRejectedValue(mockError)

      await expect(ipcClient.fileRead({ path: '/test.txt' })).rejects.toThrow()
    })

    it('should handle invalid response format', async () => {
      const invalidResponse = { invalid: 'response' }
      mockIpcRenderer.invoke.mockResolvedValue(invalidResponse)

      await expect(ipcClient.fileRead({ path: '/test.txt' })).rejects.toThrow()
    })
  })

  describe('Request Queue Management', () => {
    it('should provide queue status', () => {
      const status = ipcClient.getQueueStatus()
      
      expect(status).toHaveProperty('active')
      expect(status).toHaveProperty('queued')
      expect(typeof status.active).toBe('number')
      expect(typeof status.queued).toBe('number')
    })

    it('should clear request queue', () => {
      expect(() => ipcClient.clearQueue()).not.toThrow()
    })
  })

  describe('Retry Functionality', () => {
    it('should retry failed requests', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        content: 'test content',
        encoding: 'utf8'
      })
      
      mockIpcRenderer.invoke
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse)

      const result = await ipcClient.sendRequestWithRetry(
        IPC_CHANNELS.FILE_READ,
        { path: '/test.txt' },
        3
      )

      expect(result.content).toBe('test content')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(3)
    })
  })
})