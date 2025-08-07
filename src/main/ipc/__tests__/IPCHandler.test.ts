// Integration tests for IPC handlers

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import { IPCHandler } from '../IPCHandler'
import { FileSystemManager } from '../../services/FileSystemManager'
import { ProcessManager } from '../../services/ProcessManager'
import { WorkspaceManager } from '../../services/WorkspaceManager'
import {
  IPC_CHANNELS,
  createIPCRequest,
  FileReadRequest,
  FileWriteRequest,
  ProcessExecuteRequest,
  WorkspaceLoadRequest
} from '../../../shared/types/IPC'

// Mock Electron's ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeAllListeners: vi.fn()
  }
}))

describe('IPCHandler', () => {
  let ipcHandler: IPCHandler
  let mockFileSystemManager: FileSystemManager
  let mockProcessManager: ProcessManager
  let mockWorkspaceManager: WorkspaceManager

  beforeEach(() => {
    // Create mock services
    mockFileSystemManager = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      exists: vi.fn(),
      ensureDirectory: vi.fn(),
      listDirectory: vi.fn(),
      createProject: vi.fn(),
      getProjectStructure: vi.fn()
    } as any

    mockProcessManager = {
      executeCommand: vi.fn(),
      killProcess: vi.fn(),
      getRunningProcesses: vi.fn(),
      startTerminal: vi.fn(),
      executeInTerminal: vi.fn(),
      getTerminalSession: vi.fn(),
      getTerminalSessions: vi.fn(),
      isCommandAvailable: vi.fn()
    } as any

    mockWorkspaceManager = {
      saveWorkspace: vi.fn(),
      loadWorkspace: vi.fn(),
      getRecentWorkspaces: vi.fn(),
      setActiveProject: vi.fn()
    } as any

    // Create IPC handler
    ipcHandler = new IPCHandler(
      mockFileSystemManager,
      mockProcessManager,
      mockWorkspaceManager
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    ipcHandler.cleanup()
  })

  describe('Handler Registration', () => {
    it('should register all IPC handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledTimes(Object.keys(IPC_CHANNELS).length)
      
      // Check that specific channels are registered
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.FILE_READ, expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.PROCESS_EXECUTE, expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.WORKSPACE_LOAD, expect.any(Function))
    })
  })

  describe('File System Handlers', () => {
    it('should handle file read requests', async () => {
      const mockContent = 'test file content'
      mockFileSystemManager.readFile = vi.fn().mockResolvedValue(mockContent)

      // Get the handler function that was registered
      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.FILE_READ
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.FILE_READ, { path: '/test/file.txt' })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data).toEqual({
        content: mockContent,
        encoding: 'utf8'
      })
      expect(mockFileSystemManager.readFile).toHaveBeenCalledWith('/test/file.txt')
    })

    it('should handle file write requests', async () => {
      mockFileSystemManager.writeFile = vi.fn().mockResolvedValue(undefined)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.FILE_WRITE
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.FILE_WRITE, {
        path: '/test/file.txt',
        content: 'test content'
      })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.bytesWritten).toBeGreaterThan(0)
      expect(mockFileSystemManager.writeFile).toHaveBeenCalledWith('/test/file.txt', 'test content')
    })

    it('should handle file system errors', async () => {
      const error = new Error('File not found')
      error.name = 'FileSystemError'
      mockFileSystemManager.readFile = vi.fn().mockRejectedValue(error)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.FILE_READ
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.FILE_READ, { path: '/nonexistent.txt' })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error?.message).toBe('File not found')
    })
  })

  describe('Process Management Handlers', () => {
    it('should handle process execution requests', async () => {
      const mockResult = {
        success: true,
        stdout: 'command output',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 1000
      }
      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockResult)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.PROCESS_EXECUTE
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.PROCESS_EXECUTE, {
        command: 'echo',
        args: ['hello'],
        cwd: '/test'
      })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.stdout).toBe('command output')
      expect(response.data.exitCode).toBe(0)
      expect(mockProcessManager.executeCommand).toHaveBeenCalledWith(
        'echo',
        ['hello'],
        '/test',
        { env: undefined, timeout: undefined }
      )
    })

    it('should handle terminal creation requests', async () => {
      const mockSession = {
        id: 'terminal-1',
        pid: 1234,
        cwd: '/test',
        isAlive: () => true
      }
      mockProcessManager.startTerminal = vi.fn().mockReturnValue(mockSession)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.TERMINAL_CREATE
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.TERMINAL_CREATE, {
        cwd: '/test',
        shell: 'bash'
      })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.terminalId).toBe('terminal-1')
      expect(response.data.pid).toBe(1234)
      expect(mockProcessManager.startTerminal).toHaveBeenCalledWith({
        cwd: '/test',
        shell: 'bash',
        env: undefined
      })
    })
  })

  describe('Workspace Handlers', () => {
    it('should handle workspace load requests', async () => {
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
      mockWorkspaceManager.loadWorkspace = vi.fn().mockResolvedValue(mockWorkspace)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.WORKSPACE_LOAD
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.WORKSPACE_LOAD, {
        path: '/test/project'
      })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.workspace).toEqual(mockWorkspace)
      expect(mockWorkspaceManager.loadWorkspace).toHaveBeenCalledWith('/test/project')
    })

    it('should handle workspace save requests', async () => {
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
      mockWorkspaceManager.saveWorkspace = vi.fn().mockResolvedValue(undefined)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.WORKSPACE_SAVE
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.WORKSPACE_SAVE, {
        workspace: mockWorkspace
      })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.saved).toBe(true)
      expect(response.data.path).toBe('/test/project')
      expect(mockWorkspaceManager.saveWorkspace).toHaveBeenCalledWith(mockWorkspace)
    })
  })

  describe('Build and Test Handlers', () => {
    it('should handle build program requests', async () => {
      const mockResult = {
        success: true,
        stdout: 'Build successful',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 5000
      }
      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockResult)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.BUILD_PROGRAM
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.BUILD_PROGRAM, {
        projectPath: '/test/project',
        release: true
      })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.success).toBe(true)
      expect(response.data.buildId).toBeDefined()
      expect(response.data.duration).toBe(5000)
    })

    it('should handle test run requests', async () => {
      const mockResult = {
        success: true,
        stdout: 'All tests passed',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 3000
      }
      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockResult)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.TEST_RUN
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.TEST_RUN, {
        projectPath: '/test/project',
        verbose: true
      })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.success).toBe(true)
      expect(response.data.testId).toBeDefined()
      expect(response.data.duration).toBe(3000)
    })
  })

  describe('Toolchain Handlers', () => {
    it('should handle toolchain detection requests', async () => {
      const mockSolanaResult = {
        success: true,
        stdout: 'solana-cli 1.14.0',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 100
      }
      const mockRustResult = {
        success: true,
        stdout: 'rustc 1.70.0',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 100
      }
      
      mockProcessManager.executeCommand = vi.fn()
        .mockResolvedValueOnce(mockSolanaResult)
        .mockResolvedValueOnce(mockRustResult)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.TOOLCHAIN_DETECT
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.TOOLCHAIN_DETECT, {})
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.detected).toBe(true)
      expect(response.data.version).toBe('solana-cli 1.14.0')
      expect(response.data.components).toHaveLength(2)
    })

    it('should handle toolchain validation requests', async () => {
      mockProcessManager.isCommandAvailable = vi.fn()
        .mockResolvedValueOnce(true)  // solana
        .mockResolvedValueOnce(true)  // rustc

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.TOOLCHAIN_VALIDATE
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.TOOLCHAIN_VALIDATE, {})
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(true)
      expect(response.data.valid).toBe(true)
      expect(response.data.errors).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid request format', async () => {
      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.FILE_READ
      )
      const handler = handleCall[1]

      const invalidRequest = { invalid: 'request' }
      const mockEvent = {} as any

      const response = await handler(mockEvent, invalidRequest)

      expect(response.success).toBe(false)
      expect(response.error?.code).toBe('VALIDATION_ERROR')
      expect(response.error?.message).toBe('Invalid request format')
    })

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service unavailable')
      mockFileSystemManager.readFile = vi.fn().mockRejectedValue(error)

      const handleCall = (ipcMain.handle as any).mock.calls.find(
        (call: any) => call[0] === IPC_CHANNELS.FILE_READ
      )
      const handler = handleCall[1]

      const request = createIPCRequest(IPC_CHANNELS.FILE_READ, { path: '/test.txt' })
      const mockEvent = {} as any

      const response = await handler(mockEvent, request)

      expect(response.success).toBe(false)
      expect(response.error?.message).toBe('Service unavailable')
    })
  })

  describe('Cleanup', () => {
    it('should remove all IPC handlers on cleanup', () => {
      ipcHandler.cleanup()

      expect(ipcMain.removeAllListeners).toHaveBeenCalledTimes(Object.keys(IPC_CHANNELS).length)
      
      // Check that specific channels are cleaned up
      Object.values(IPC_CHANNELS).forEach(channel => {
        expect(ipcMain.removeAllListeners).toHaveBeenCalledWith(channel)
      })
    })
  })
})