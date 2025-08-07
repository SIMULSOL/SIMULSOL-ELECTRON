// End-to-end integration tests for IPC handlers
// These tests simulate real-world usage scenarios

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import { IPCHandler } from '../IPCHandler'
import { FileSystemManager } from '../../services/FileSystemManager'
import { ProcessManager } from '../../services/ProcessManager'
import { WorkspaceManager } from '../../services/WorkspaceManager'
import {
  IPC_CHANNELS,
  createIPCRequest,
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

describe('IPCHandler End-to-End Integration', () => {
  let ipcHandler: IPCHandler
  let mockFileSystemManager: FileSystemManager
  let mockProcessManager: ProcessManager
  let mockWorkspaceManager: WorkspaceManager
  let registeredHandlers: Map<string, Function>

  beforeEach(() => {
    registeredHandlers = new Map()
    
    // Mock ipcMain.handle to capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    // Create realistic mock services
    mockFileSystemManager = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      exists: vi.fn(),
      ensureDirectory: vi.fn(),
      listDirectory: vi.fn(),
      createProject: vi.fn(),
      getProjectStructure: vi.fn(),
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
      cleanup: vi.fn()
    } as any

    mockWorkspaceManager = {
      saveWorkspace: vi.fn(),
      loadWorkspace: vi.fn(),
      getRecentWorkspaces: vi.fn(),
      setActiveProject: vi.fn(),
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

  describe('Complete Solana Project Development Workflow', () => {
    it('should handle a complete project development lifecycle', async () => {
      // Step 1: Create a new Anchor project
      const mockTemplate = {
        name: 'anchor-template',
        type: 'anchor' as const,
        files: [
          { path: 'src/lib.rs', content: 'use anchor_lang::prelude::*;\n\n#[program]\npub mod my_program {\n    use super::*;\n\n    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {\n        Ok(())\n    }\n}' },
          { path: 'Anchor.toml', content: '[features]\nseeds = false\nskip-lint = false\n\n[programs.localnet]\nmy_program = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"' },
          { path: 'Cargo.toml', content: '[package]\nname = "my-program"\nversion = "0.1.0"\nedition = "2021"' }
        ],
        directories: ['src', 'tests', 'migrations']
      }

      const mockProject = {
        name: 'my-solana-project',
        path: '/workspace/my-solana-project',
        type: 'anchor' as const,
        files: [],
        configuration: { name: 'my-solana-project', version: '0.1.0', anchorVersion: '0.28.0' },
        dependencies: []
      }

      mockFileSystemManager.createProject = vi.fn().mockResolvedValue(mockProject)

      let response = await executeHandler(IPC_CHANNELS.PROJECT_CREATE, {
        template: mockTemplate,
        path: '/workspace/my-solana-project',
        name: 'my-solana-project'
      })

      expect(response.success).toBe(true)
      expect(response.data?.project.name).toBe('my-solana-project')
      expect(response.data?.project.type).toBe('anchor')

      // Step 2: Load the project workspace
      const mockWorkspace = {
        activeProject: '/workspace/my-solana-project',
        openFiles: [
          {
            path: '/workspace/my-solana-project/src/lib.rs',
            content: 'use anchor_lang::prelude::*;',
            isDirty: false,
            cursorPosition: { line: 0, column: 0 },
            scrollPosition: 0,
            isActive: true
          }
        ],
        layout: {
          panels: [
            { id: 'explorer', type: 'explorer' as const, size: 250, isVisible: true, position: 'left' as const },
            { id: 'editor', type: 'editor' as const, size: 0, isVisible: true, position: 'center' as const },
            { id: 'terminal', type: 'terminal' as const, size: 200, isVisible: true, position: 'bottom' as const }
          ],
          sidebarWidth: 250,
          bottomPanelHeight: 200,
          isBottomPanelVisible: true,
          isSidebarVisible: true,
          splitterPositions: { sidebar: 250, bottomPanel: 200 },
          activePanel: 'editor'
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
        recentProjects: ['/workspace/my-solana-project'],
        lastSaved: new Date(),
        version: '1.0.0'
      }

      mockWorkspaceManager.loadWorkspace = vi.fn().mockResolvedValue(mockWorkspace)

      response = await executeHandler(IPC_CHANNELS.WORKSPACE_LOAD, {
        path: '/workspace/my-solana-project'
      })

      expect(response.success).toBe(true)
      expect(response.data?.workspace.activeProject).toBe('/workspace/my-solana-project')
      expect(response.data?.workspace.openFiles).toHaveLength(1)

      // Step 3: Create a terminal session for development
      const mockTerminalSession = {
        id: 'terminal-1',
        pid: 1234,
        cwd: '/workspace/my-solana-project',
        write: vi.fn(),
        resize: vi.fn(),
        kill: vi.fn(),
        isAlive: vi.fn().mockReturnValue(true)
      }

      mockProcessManager.startTerminal = vi.fn().mockReturnValue(mockTerminalSession)

      response = await executeHandler(IPC_CHANNELS.TERMINAL_CREATE, {
        cwd: '/workspace/my-solana-project',
        shell: 'bash'
      })

      expect(response.success).toBe(true)
      expect(response.data?.terminalId).toBe('terminal-1')
      expect(response.data?.pid).toBe(1234)

      // Step 4: Validate the Solana toolchain
      mockProcessManager.isCommandAvailable = vi.fn()
        .mockResolvedValueOnce(true)  // solana
        .mockResolvedValueOnce(true)  // rustc

      response = await executeHandler(IPC_CHANNELS.TOOLCHAIN_VALIDATE, {})

      expect(response.success).toBe(true)
      expect(response.data?.valid).toBe(true)
      expect(response.data?.errors).toHaveLength(0)

      // Step 5: Build the project
      const mockBuildResult = {
        success: true,
        stdout: 'Finished release [optimized] target(s) in 2.34s',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 2340
      }

      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockBuildResult)

      response = await executeHandler(IPC_CHANNELS.BUILD_PROGRAM, {
        projectPath: '/workspace/my-solana-project',
        release: true
      })

      expect(response.success).toBe(true)
      expect(response.data?.success).toBe(true)
      expect(response.data?.buildId).toBeDefined()
      expect(response.data?.duration).toBe(2340)

      // Step 6: Run tests
      const mockTestResult = {
        success: true,
        stdout: 'test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 1500
      }

      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockTestResult)

      response = await executeHandler(IPC_CHANNELS.TEST_RUN, {
        projectPath: '/workspace/my-solana-project',
        verbose: true
      })

      expect(response.success).toBe(true)
      expect(response.data?.success).toBe(true)
      expect(response.data?.testId).toBeDefined()
      expect(response.data?.duration).toBe(1500)

      // Step 7: Save the workspace state
      mockWorkspaceManager.saveWorkspace = vi.fn().mockResolvedValue(undefined)

      response = await executeHandler(IPC_CHANNELS.WORKSPACE_SAVE, {
        workspace: mockWorkspace
      })

      expect(response.success).toBe(true)
      expect(response.data?.saved).toBe(true)
      expect(response.data?.path).toBe('/workspace/my-solana-project')

      // Verify all services were called appropriately
      expect(mockFileSystemManager.createProject).toHaveBeenCalledWith(mockTemplate, '/workspace/my-solana-project')
      expect(mockWorkspaceManager.loadWorkspace).toHaveBeenCalledWith('/workspace/my-solana-project')
      expect(mockProcessManager.startTerminal).toHaveBeenCalledWith({
        cwd: '/workspace/my-solana-project',
        shell: 'bash',
        env: undefined
      })
      expect(mockProcessManager.isCommandAvailable).toHaveBeenCalledWith('solana')
      expect(mockProcessManager.isCommandAvailable).toHaveBeenCalledWith('rustc')
      expect(mockProcessManager.executeCommand).toHaveBeenCalledWith('cargo', ['build-bpf'], '/workspace/my-solana-project')
      expect(mockProcessManager.executeCommand).toHaveBeenCalledWith('cargo', ['test'], '/workspace/my-solana-project')
      expect(mockWorkspaceManager.saveWorkspace).toHaveBeenCalledWith(mockWorkspace)
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should handle and recover from cascading failures', async () => {
      // Simulate a scenario where toolchain is missing, causing build failures
      
      // Step 1: Try to validate toolchain (should fail)
      mockProcessManager.isCommandAvailable = vi.fn()
        .mockResolvedValueOnce(false)  // solana not available
        .mockResolvedValueOnce(true)   // rustc available

      let response = await executeHandler(IPC_CHANNELS.TOOLCHAIN_VALIDATE, {})

      expect(response.success).toBe(true)
      expect(response.data?.valid).toBe(false)
      expect(response.data?.errors).toContain('Solana CLI not found')

      // Step 2: Try to build anyway (should fail)
      const mockBuildError = {
        success: false,
        stdout: '',
        stderr: 'solana: command not found',
        exitCode: 127,
        signal: null,
        duration: 100
      }

      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockBuildError)

      response = await executeHandler(IPC_CHANNELS.BUILD_PROGRAM, {
        projectPath: '/workspace/my-solana-project',
        release: true
      })

      expect(response.success).toBe(true)
      expect(response.data?.success).toBe(false)
      expect(response.data?.errors).toHaveLength(1)
      expect(response.data?.errors[0].message).toContain('solana: command not found')

      // Step 3: Simulate toolchain installation (placeholder)
      response = await executeHandler(IPC_CHANNELS.TOOLCHAIN_INSTALL, {
        version: 'latest'
      })

      expect(response.success).toBe(true)
      expect(response.data?.installed).toBe(false) // Placeholder implementation
      expect(response.data?.version).toBe('latest')

      // Step 4: Re-validate toolchain (now should pass)
      mockProcessManager.isCommandAvailable = vi.fn()
        .mockResolvedValueOnce(true)  // solana now available
        .mockResolvedValueOnce(true)  // rustc available

      response = await executeHandler(IPC_CHANNELS.TOOLCHAIN_VALIDATE, {})

      expect(response.success).toBe(true)
      expect(response.data?.valid).toBe(true)
      expect(response.data?.errors).toHaveLength(0)

      // Step 5: Build should now succeed
      const mockSuccessfulBuild = {
        success: true,
        stdout: 'Build completed successfully',
        stderr: '',
        exitCode: 0,
        signal: null,
        duration: 3000
      }

      mockProcessManager.executeCommand = vi.fn().mockResolvedValue(mockSuccessfulBuild)

      response = await executeHandler(IPC_CHANNELS.BUILD_PROGRAM, {
        projectPath: '/workspace/my-solana-project',
        release: true
      })

      expect(response.success).toBe(true)
      expect(response.data?.success).toBe(true)
      expect(response.data?.errors).toHaveLength(0)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple file operations concurrently', async () => {
      // Setup mocks for concurrent file operations
      mockFileSystemManager.readFile = vi.fn()
        .mockImplementation((path: string) => {
          // Simulate different response times
          const delay = path.includes('large') ? 100 : 10
          return new Promise(resolve => 
            setTimeout(() => resolve(`Content of ${path}`), delay)
          )
        })

      mockFileSystemManager.writeFile = vi.fn()
        .mockImplementation((path: string, content: string) => {
          const delay = content.length > 100 ? 50 : 5
          return new Promise(resolve => 
            setTimeout(() => resolve(undefined), delay)
          )
        })

      mockFileSystemManager.exists = vi.fn().mockResolvedValue(true)

      // Execute multiple operations concurrently
      const operations = [
        executeHandler(IPC_CHANNELS.FILE_READ, { path: '/project/src/lib.rs' }),
        executeHandler(IPC_CHANNELS.FILE_READ, { path: '/project/tests/test.rs' }),
        executeHandler(IPC_CHANNELS.FILE_READ, { path: '/project/large-file.rs' }),
        executeHandler(IPC_CHANNELS.FILE_WRITE, { 
          path: '/project/new-file.rs', 
          content: 'use anchor_lang::prelude::*;' 
        }),
        executeHandler(IPC_CHANNELS.FILE_EXISTS, { path: '/project/Cargo.toml' })
      ]

      const responses = await Promise.all(operations)

      // All operations should succeed
      responses.forEach((response, index) => {
        expect(response.success).toBe(true)
        
        if (index < 3) {
          // File read operations
          expect(response.data?.content).toBeDefined()
        } else if (index === 3) {
          // File write operation
          expect(response.data?.bytesWritten).toBeGreaterThan(0)
        } else {
          // File exists operation
          expect(response.data?.exists).toBe(true)
        }
      })

      // Verify all service methods were called
      expect(mockFileSystemManager.readFile).toHaveBeenCalledTimes(3)
      expect(mockFileSystemManager.writeFile).toHaveBeenCalledTimes(1)
      expect(mockFileSystemManager.exists).toHaveBeenCalledTimes(1)
    })
  })

  describe('Resource Management', () => {
    it('should properly manage file watchers and cleanup resources', async () => {
      const mockWatcher1 = { close: vi.fn() }
      const mockWatcher2 = { close: vi.fn() }

      mockFileSystemManager.watchFiles = vi.fn()
        .mockReturnValueOnce(mockWatcher1)
        .mockReturnValueOnce(mockWatcher2)

      // Create multiple file watchers
      let response = await executeHandler(IPC_CHANNELS.FILE_WATCH, {
        paths: ['*.rs'],
        options: { recursive: true }
      })
      expect(response.success).toBe(true)
      const watcherId1 = response.data?.watcherId

      response = await executeHandler(IPC_CHANNELS.FILE_WATCH, {
        paths: ['*.toml'],
        options: { recursive: false }
      })
      expect(response.success).toBe(true)
      const watcherId2 = response.data?.watcherId

      // Verify watchers are tracked
      const handler = ipcHandler as any
      expect(handler.activeWatchers.size).toBe(2)

      // Remove one watcher
      response = await executeHandler(IPC_CHANNELS.FILE_UNWATCH, {
        watcherId: watcherId1!
      })
      expect(response.success).toBe(true)
      expect(response.data?.unwatched).toBe(true)
      expect(mockWatcher1.close).toHaveBeenCalled()
      expect(handler.activeWatchers.size).toBe(1)

      // Cleanup should close remaining watchers
      ipcHandler.cleanup()
      expect(mockWatcher2.close).toHaveBeenCalled()
      expect(handler.activeWatchers.size).toBe(0)
    })
  })
})