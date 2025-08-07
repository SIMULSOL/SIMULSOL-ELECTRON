// Comprehensive integration tests for IPC handlers

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import { IPCHandler } from '../IPCHandler'
import { FileSystemManager } from '../../services/FileSystemManager'
import { ProcessManager } from '../../services/ProcessManager'
import { WorkspaceManager } from '../../services/WorkspaceManager'
import {
  IPC_CHANNELS,
  createIPCRequest,
  createIPCResponse,
  IPCRequest,
  IPCResponse
} from '../../../shared/types/IPC'

// Mock Electron's ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeAllListeners: vi.fn()
  }
}))

describe('IPCHandler Integration Tests', () => {
  let ipcHandler: IPCHandler
  let mockFileSystemManager: FileSystemManager
  let mockProcessManager: ProcessManager
  let mockWorkspaceManager: WorkspaceManager
  let registeredHandlers: Map<string, Function>

  beforeEach(() => {
    // Reset the registered handlers map
    registeredHandlers = new Map()
    
    // Mock ipcMain.handle to capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    // Create comprehensive mock services
    mockFileSystemManager = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      exists: vi.fn(),
      ensureDirectory: vi.fn(),
      listDirectory: vi.fn(),
      createProject: vi.fn(),
      getProjectStructure: vi.fn(),
      copyFile: vi.fn(),
      moveFile: vi.fn(),
      watchFiles: vi.fn(),
      cleanup: vi.fn()
    } as any

    mockProcessManager = {
      executeCommand: vi.fn(),
      killProcess: vi.fn(),
      getRunningProcesses: vi.fn(),
      startTerminal: vi.fn(),
      executeInTerminal: vi.fn(),
      getTerminalSession: vi.fn(),
      getTerminalSessions: vi.fn(),
      isCommandAvailable: vi.fn(),
      getSystemInfo: vi.fn(),
      cleanup: vi.fn()
    } as any

    mockWorkspaceManager = {
      saveWorkspace: vi.fn(),
      loadWorkspace: vi.fn(),
      getRecentWorkspaces: vi.fn(),
      setActiveProject: vi.fn(),
      updateOpenFile: vi.fn(),
      closeFile: vi.fn(),
      updateLayout: vi.fn(),
      updatePreferences: vi.fn(),
      updateTerminalSession: vi.fn(),
      removeTerminalSession: vi.fn(),
      getCurrentWorkspace: vi.fn(),
      isDirtyWorkspace: vi.fn(),
      createRecoveryFile: vi.fn(),
      recoverWorkspace: vi.fn(),
      configureAutoSave: vi.fn(),
      forceSave: vi.fn(),
      cleanup: vi.fn()
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

  // Helper function to execute a handler
  async function executeHandler(channel: string, requestData: any): Promise<IPCResponse> {
    const handler = registeredHandlers.get(channel)
    if (!handler) {
      throw new Error(`Handler not found for channel: ${channel}`)
    }

    const request = createIPCRequest(channel as any, requestData)
    const mockEvent = {} as any
    
    return await handler(mockEvent, request)
  }

  describe('File System Operations Integration', () => {
    it('should handle complete file operations workflow', async () => {
      // Setup mocks for file operations
      mockFileSystemManager.exists = vi.fn()
        .mockResolvedValueOnce(false) // File doesn't exist initially
        .mockResolvedValueOnce(true)  // File exists after creation

      mockFileSystemManager.writeFile = vi.fn().mockResolvedValue(undefined)
      mockFileSystemManager.readFile = vi.fn().mockResolvedValue('test content')
      mockFileSystemManager.deleteFile = vi.fn().mockResolvedValue(undefined)

      // 1. Check if file exists (should be false)
      let response = await executeHandler(IPC_CHANNELS.FILE_EXISTS, { path: '/test/file.txt' })
      expect(response.success).toBe(true)
      expect(response.data?.exists).toBe(false)

      // 2. Create file
      response = await executeHandler(IPC_CHANNELS.FILE_WRITE, {
        path: '/test/file.txt',
        content: 'test content'
      })
      expect(response.success).toBe(true)
      expect(response.data?.bytesWritten).toBeGreaterThan(0)

      // 3. Check if file exists (should be true)
      response = await executeHandler(IPC_CHANNELS.FILE_EXISTS, { path: '/test/file.txt' })
      expect(response.success).toBe(true)
      expect(response.data?.exists).toBe(true)

      // 4. Read file content
      response = await executeHandler(IPC_CHANNELS.FILE_READ, { path: '/test/file.txt' })
      expect(response.success).toBe(true)
      expect(response.data?.content).toBe('test content')

      // 5. Delete file
      response = await executeHandler(IPC_CHANNELS.FILE_DELETE, { path: '/test/file.txt' })
      expect(response.success).toBe(true)
      expect(response.data?.deleted).toBe(true)

      // Verify all operations were called
      expect(mockFileSystemManager.exists).toHaveBeenCalledTimes(2)
      expect(mockFileSystemManager.writeFile).toHaveBeenCalledWith('/test/file.txt', 'test content')
      expect(mockFileSystemManager.readFile).toHaveBeenCalledWith('/test/file.txt')
      expect(mockFileSystemManager.deleteFile).toHaveBeenCalledWith('/test/file.txt')
    })

    it('should handle directory operations', async () => {
      const mockFiles = [
        {
          name: 'file1.txt',
          path: '/test/file1.txt',
          type: 'file' as const,
          metadata: { size: 100, modified: new Date(), isHidden: false }
        },
        {
          name: 'subdir',
          path: '/test/subdir',
          type: 'directory' as const,
          metadata: { size: 0, modified: new Date(), isHidden: false },
          children: []
        }
      ]

      mockFileSystemManager.ensureDirectory = vi.fn().mockResolvedValue(undefined)
      mockFileSystemManager.listDirectory = vi.fn().mockResolvedValue(mockFiles)

      // Create directory
      let response = await executeHandler(IPC_CHANNELS.DIR_CREATE, { path: '/test/newdir' })
      expect(response.success).toBe(true)
      expect(response.data?.created).toBe(true)

      // List directory contents
      response = await executeHandler(IPC_CHANNELS.DIR_READ, { path: '/test' })
      expect(response.success).toBe(true)
      expect(response.data?.files).toHaveLength(2)
      expect(response.data?.files[0].name).toBe('file1.txt')
      expect(response.data?.files[1].name).toBe('subdir')

      expect(mockFileSystemManager.ensureDirectory).toHaveBeenCalledWith('/test/newdir')
      expect(mockFileSystemManager.listDirectory).toHaveBeenCalledWith('/test')
    })

    it('should handle project operations', async () => {
      const mockProject = {
        name: 'test-project',
        path: '/test/project',
        type: 'anchor' as const,
        files: [],
        configuration: { name: 'test-project', version: '1.0.0' },
        dependencies: []
      }

      const mockTemplate = {
        name: 'anchor-template',
        type: 'anchor' as const,
        files: [{ path: 'src/lib.rs', content: 'use anchor_lang::prelude::*;' }],
        directories: ['src', 'tests']
      }

      mockFileSystemManager.createProject = vi.fn().mockResolvedValue(mockProject)
      mockFileSystemManager.getProjectStructure = vi.fn().mockResolvedValue(mockProject)
      mockFileSystemManager.exists = vi.fn().mockResolvedValue(true)

      // Create project
      let response = await executeHandler(IPC_CHANNELS.PROJECT_CREATE, {
        template: mockTemplate,
        path: '/test/project',
        name: 'test-project'
      })
      expect(response.success).toBe(true)
      expect(response.data?.project.name).toBe('test-project')

      // Load project
      response = await executeHandler(IPC_CHANNELS.PROJECT_LOAD, { path: '/test/project' })
      expect(response.success).toBe(true)
      expect(response.data?.project.name).toBe('test-project')

      // Validate project
      response = await executeHandler(IPC_CHANNELS.PROJECT_VALIDATE, { path: '/test/project' })
      expect(response.success).toBe(true)
      expect(response.data?.valid).toBe(true)

      expect(mockFileSystemManager.createProject).toHaveBeenCalledWith(mockTemplate, '/test/project')
      expect(mockFileSystemManager.getProjectStructure).toHaveBeenCalledWith('/test/project')
    })
  })

  describe('Process Management Integration', () => {
    it('should handle process execution workflow', async () => {
      const mockProcessResult = {
        success: true,
        stdout: 'Hello World',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 1000
      }

      const mockProcessInfo = {
        pid: 1234,
        command: 'echo',
        args: ['Hello World'],
        cwd: '/test',
        startTime: new Date(),
        status: 'running' as const
      }

      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockProcessResult)
      mockProcessManager.getRunningProcesses = vi.fn().mockReturnValue([mockProcessInfo])
      mockProcessManager.killProcess = vi.fn().mockResolvedValue(undefined)

      // Execute command
      let response = await executeHandler(IPC_CHANNELS.PROCESS_EXECUTE, {
        command: 'echo',
        args: ['Hello World'],
        cwd: '/test'
      })
      expect(response.success).toBe(true)
      expect(response.data?.stdout).toBe('Hello World')
      expect(response.data?.exitCode).toBe(0)

      // List running processes
      response = await executeHandler(IPC_CHANNELS.PROCESS_LIST, {})
      expect(response.success).toBe(true)
      expect(response.data?.processes).toHaveLength(1)
      expect(response.data?.processes[0].command).toBe('echo')

      // Kill process
      response = await executeHandler(IPC_CHANNELS.PROCESS_KILL, { pid: 1234 })
      expect(response.success).toBe(true)
      expect(response.data?.killed).toBe(true)

      expect(mockProcessManager.executeCommand).toHaveBeenCalledWith(
        'echo',
        ['Hello World'],
        '/test',
        { env: undefined, timeout: undefined }
      )
      expect(mockProcessManager.killProcess).toHaveBeenCalledWith(1234)
    })

    it('should handle terminal session management', async () => {
      const mockTerminalSession = {
        id: 'terminal-1',
        pid: 5678,
        cwd: '/test',
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
        isAlive: vi.fn().mockReturnValue(true)
      }

      mockProcessManager.startTerminal = vi.fn().mockReturnValue(mockTerminalSession)
      mockProcessManager.getTerminalSession = vi.fn().mockReturnValue(mockTerminalSession)
      mockProcessManager.getTerminalSessions = vi.fn().mockReturnValue([mockTerminalSession])
      mockProcessManager.executeInTerminal = vi.fn()

      // Create terminal
      let response = await executeHandler(IPC_CHANNELS.TERMINAL_CREATE, {
        cwd: '/test',
        shell: 'bash'
      })
      expect(response.success).toBe(true)
      expect(response.data?.terminalId).toBe('terminal-1')
      expect(response.data?.pid).toBe(5678)

      // Send input to terminal
      response = await executeHandler(IPC_CHANNELS.TERMINAL_INPUT, {
        terminalId: 'terminal-1',
        input: 'ls -la\n'
      })
      expect(response.success).toBe(true)
      expect(response.data?.sent).toBe(true)

      // Resize terminal
      response = await executeHandler(IPC_CHANNELS.TERMINAL_RESIZE, {
        terminalId: 'terminal-1',
        cols: 80,
        rows: 24
      })
      expect(response.success).toBe(true)
      expect(response.data?.resized).toBe(true)

      // List terminals
      response = await executeHandler(IPC_CHANNELS.TERMINAL_LIST, {})
      expect(response.success).toBe(true)
      expect(response.data?.terminals).toHaveLength(1)
      expect(response.data?.terminals[0].id).toBe('terminal-1')

      // Close terminal
      response = await executeHandler(IPC_CHANNELS.TERMINAL_CLOSE, {
        terminalId: 'terminal-1'
      })
      expect(response.success).toBe(true)
      expect(response.data?.closed).toBe(true)

      expect(mockProcessManager.startTerminal).toHaveBeenCalledWith({
        cwd: '/test',
        shell: 'bash',
        env: undefined
      })
      expect(mockProcessManager.executeInTerminal).toHaveBeenCalledWith('terminal-1', 'ls -la\n')
    })
  })

  describe('Workspace Management Integration', () => {
    it('should handle complete workspace lifecycle', async () => {
      const mockWorkspace = {
        activeProject: '/test/project',
        openFiles: [
          {
            path: '/test/project/src/lib.rs',
            content: 'use anchor_lang::prelude::*;',
            isDirty: false,
            cursorPosition: { line: 0, column: 0 },
            scrollPosition: 0,
            isActive: true
          }
        ],
        layout: {
          panels: [
            {
              id: 'explorer',
              type: 'explorer' as const,
              size: 250,
              isVisible: true,
              position: 'left' as const
            }
          ],
          sidebarWidth: 250,
          bottomPanelHeight: 200,
          isBottomPanelVisible: true,
          isSidebarVisible: true,
          splitterPositions: { sidebar: 250, bottomPanel: 200 },
          activePanel: 'explorer'
        },
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
        recentProjects: ['/test/project'],
        lastSaved: new Date(),
        version: '1.0.0'
      }

      const mockRecentWorkspaces = [
        {
          name: 'test-project',
          path: '/test/project',
          lastOpened: new Date(),
          projectType: 'anchor' as const
        }
      ]

      mockWorkspaceManager.loadWorkspace = vi.fn().mockResolvedValue(mockWorkspace)
      mockWorkspaceManager.saveWorkspace = vi.fn().mockResolvedValue(undefined)
      mockWorkspaceManager.getRecentWorkspaces = vi.fn().mockResolvedValue(mockRecentWorkspaces)
      mockWorkspaceManager.setActiveProject = vi.fn().mockResolvedValue(undefined)

      // Load workspace
      let response = await executeHandler(IPC_CHANNELS.WORKSPACE_LOAD, {
        path: '/test/project'
      })
      expect(response.success).toBe(true)
      expect(response.data?.workspace.activeProject).toBe('/test/project')
      expect(response.data?.workspace.openFiles).toHaveLength(1)

      // Save workspace
      response = await executeHandler(IPC_CHANNELS.WORKSPACE_SAVE, {
        workspace: mockWorkspace
      })
      expect(response.success).toBe(true)
      expect(response.data?.saved).toBe(true)
      expect(response.data?.path).toBe('/test/project')

      // Get recent workspaces
      response = await executeHandler(IPC_CHANNELS.WORKSPACE_RECENT, {})
      expect(response.success).toBe(true)
      expect(response.data?.workspaces).toHaveLength(1)
      expect(response.data?.workspaces[0].name).toBe('test-project')

      // Set active project
      response = await executeHandler(IPC_CHANNELS.WORKSPACE_SET_ACTIVE, {
        projectPath: '/test/another-project'
      })
      expect(response.success).toBe(true)
      expect(response.data?.activeProject).toBe('/test/another-project')

      expect(mockWorkspaceManager.loadWorkspace).toHaveBeenCalledWith('/test/project')
      expect(mockWorkspaceManager.saveWorkspace).toHaveBeenCalledWith(mockWorkspace)
      expect(mockWorkspaceManager.setActiveProject).toHaveBeenCalledWith('/test/another-project')
    })
  })

  describe('Build and Test Integration', () => {
    it('should handle build workflow', async () => {
      const mockBuildResult = {
        success: true,
        stdout: 'Build completed successfully',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 5000
      }

      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockBuildResult)

      // Build program
      let response = await executeHandler(IPC_CHANNELS.BUILD_PROGRAM, {
        projectPath: '/test/project',
        release: true
      })
      expect(response.success).toBe(true)
      expect(response.data?.success).toBe(true)
      expect(response.data?.buildId).toBeDefined()
      expect(response.data?.duration).toBe(5000)

      // Clean build
      response = await executeHandler(IPC_CHANNELS.BUILD_CLEAN, {
        projectPath: '/test/project'
      })
      expect(response.success).toBe(true)
      expect(response.data?.cleaned).toBe(true)

      expect(mockProcessManager.executeCommand).toHaveBeenCalledWith(
        'cargo',
        ['build-bpf'],
        '/test/project'
      )
    })

    it('should handle test workflow', async () => {
      const mockTestResult = {
        success: true,
        stdout: 'All tests passed',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 3000
      }

      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockTestResult)

      // Run tests
      let response = await executeHandler(IPC_CHANNELS.TEST_RUN, {
        projectPath: '/test/project',
        verbose: true
      })
      expect(response.success).toBe(true)
      expect(response.data?.success).toBe(true)
      expect(response.data?.testId).toBeDefined()
      expect(response.data?.duration).toBe(3000)

      // Debug tests
      response = await executeHandler(IPC_CHANNELS.TEST_DEBUG, {
        projectPath: '/test/project',
        verbose: true,
        breakpoints: [{ file: 'tests/test.rs', line: 10 }]
      })
      expect(response.success).toBe(true)
      expect(response.data?.testId).toBeDefined()

      expect(mockProcessManager.executeCommand).toHaveBeenCalledWith(
        'cargo',
        ['test'],
        '/test/project'
      )
    })
  })

  describe('Toolchain Integration', () => {
    it('should handle toolchain detection and validation', async () => {
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

      mockProcessManager.isCommandAvailable = vi.fn()
        .mockResolvedValueOnce(true)  // solana
        .mockResolvedValueOnce(true)  // rustc

      // Detect toolchain
      let response = await executeHandler(IPC_CHANNELS.TOOLCHAIN_DETECT, {})
      expect(response.success).toBe(true)
      expect(response.data?.detected).toBe(true)
      expect(response.data?.version).toBe('solana-cli 1.14.0')
      expect(response.data?.components).toHaveLength(2)

      // Validate toolchain
      response = await executeHandler(IPC_CHANNELS.TOOLCHAIN_VALIDATE, {})
      expect(response.success).toBe(true)
      expect(response.data?.valid).toBe(true)
      expect(response.data?.errors).toHaveLength(0)

      expect(mockProcessManager.executeCommand).toHaveBeenCalledWith('solana', ['--version'])
      expect(mockProcessManager.executeCommand).toHaveBeenCalledWith('rustc', ['--version'])
      expect(mockProcessManager.isCommandAvailable).toHaveBeenCalledWith('solana')
      expect(mockProcessManager.isCommandAvailable).toHaveBeenCalledWith('rustc')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle cascading errors across services', async () => {
      // Simulate file system error that affects workspace loading
      const fileSystemError = new Error('Permission denied')
      fileSystemError.name = 'FileSystemError'
      
      mockFileSystemManager.exists = vi.fn().mockRejectedValue(fileSystemError)

      const response = await executeHandler(IPC_CHANNELS.FILE_EXISTS, {
        path: '/restricted/file.txt'
      })

      expect(response.success).toBe(false)
      expect(response.error?.message).toBe('Permission denied')
      expect(response.error?.code).toBe('FILE_NOT_FOUND') // Based on error mapping
    })

    it('should handle process failures gracefully', async () => {
      const processError = new Error('Command not found')
      processError.name = 'ProcessError'
      
      mockProcessManager.executeCommand = vi.fn().mockRejectedValue(processError)

      const response = await executeHandler(IPC_CHANNELS.PROCESS_EXECUTE, {
        command: 'nonexistent-command',
        args: [],
        cwd: '/test'
      })

      expect(response.success).toBe(false)
      expect(response.error?.message).toBe('Command not found')
      expect(response.error?.code).toBe('PROCESS_FAILED')
    })

    it('should handle workspace corruption scenarios', async () => {
      const workspaceError = new Error('Workspace file corrupted')
      workspaceError.name = 'WorkspaceError'
      
      mockWorkspaceManager.loadWorkspace = vi.fn().mockRejectedValue(workspaceError)

      const response = await executeHandler(IPC_CHANNELS.WORKSPACE_LOAD, {
        path: '/corrupted/workspace'
      })

      expect(response.success).toBe(false)
      expect(response.error?.message).toBe('Workspace file corrupted')
      expect(response.error?.code).toBe('WORKSPACE_ERROR')
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent requests', async () => {
      // Setup mocks for concurrent operations
      mockFileSystemManager.readFile = vi.fn()
        .mockImplementation((path: string) => 
          Promise.resolve(`Content of ${path}`)
        )

      // Execute multiple file read operations concurrently
      const promises = [
        executeHandler(IPC_CHANNELS.FILE_READ, { path: '/file1.txt' }),
        executeHandler(IPC_CHANNELS.FILE_READ, { path: '/file2.txt' }),
        executeHandler(IPC_CHANNELS.FILE_READ, { path: '/file3.txt' })
      ]

      const responses = await Promise.all(promises)

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.success).toBe(true)
        expect(response.data?.content).toBe(`Content of /file${index + 1}.txt`)
      })

      expect(mockFileSystemManager.readFile).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed operation types concurrently', async () => {
      // Setup mocks
      mockFileSystemManager.readFile = vi.fn().mockResolvedValue('file content')
      mockProcessManager.executeCommand = vi.fn().mockResolvedValue({
        success: true,
        stdout: 'command output',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 100
      })
      mockWorkspaceManager.getRecentWorkspaces = vi.fn().mockResolvedValue([])

      // Execute different types of operations concurrently
      const promises = [
        executeHandler(IPC_CHANNELS.FILE_READ, { path: '/test.txt' }),
        executeHandler(IPC_CHANNELS.PROCESS_EXECUTE, { 
          command: 'echo', 
          args: ['test'], 
          cwd: '/test' 
        }),
        executeHandler(IPC_CHANNELS.WORKSPACE_RECENT, {})
      ]

      const responses = await Promise.all(promises)

      // All different operation types should succeed
      expect(responses[0].success).toBe(true) // File read
      expect(responses[1].success).toBe(true) // Process execute
      expect(responses[2].success).toBe(true) // Workspace recent

      expect(mockFileSystemManager.readFile).toHaveBeenCalledOnce()
      expect(mockProcessManager.executeCommand).toHaveBeenCalledOnce()
      expect(mockWorkspaceManager.getRecentWorkspaces).toHaveBeenCalledOnce()
    })
  })
})