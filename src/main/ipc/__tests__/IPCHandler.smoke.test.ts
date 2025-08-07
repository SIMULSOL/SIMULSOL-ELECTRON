// Smoke tests to verify IPC handler basic functionality

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IPCHandler } from '../IPCHandler'
import { FileSystemManager } from '../../services/FileSystemManager'
import { ProcessManager } from '../../services/ProcessManager'
import { WorkspaceManager } from '../../services/WorkspaceManager'
import { IPC_CHANNELS } from '../../../shared/types/IPC'

// Mock Electron's ipcMain
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeAllListeners: vi.fn()
  }
}))

describe('IPCHandler Smoke Tests', () => {
  let ipcHandler: IPCHandler
  let mockFileSystemManager: FileSystemManager
  let mockProcessManager: ProcessManager
  let mockWorkspaceManager: WorkspaceManager

  beforeEach(() => {
    // Create minimal mock services
    mockFileSystemManager = {
      cleanup: vi.fn(),
      watchFiles: vi.fn().mockReturnValue({ close: vi.fn() })
    } as any

    mockProcessManager = {
      cleanup: vi.fn()
    } as any

    mockWorkspaceManager = {
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

  it('should initialize without errors', () => {
    expect(ipcHandler).toBeDefined()
    expect(ipcHandler).toBeInstanceOf(IPCHandler)
  })

  it('should register all expected IPC channels', () => {
    const { ipcMain } = require('electron')
    
    // Verify that all channels from IPC_CHANNELS are registered
    const expectedChannels = Object.values(IPC_CHANNELS)
    const registeredChannels = vi.mocked(ipcMain.handle).mock.calls.map(call => call[0])
    
    expectedChannels.forEach(channel => {
      expect(registeredChannels).toContain(channel)
    })
  })

  it('should cleanup properly', () => {
    const { ipcMain } = require('electron')
    
    ipcHandler.cleanup()
    
    // Verify cleanup was called for all channels
    const expectedChannels = Object.values(IPC_CHANNELS)
    expectedChannels.forEach(channel => {
      expect(ipcMain.removeAllListeners).toHaveBeenCalledWith(channel)
    })
  })

  it('should handle file watcher cleanup', () => {
    const mockWatcher = { close: vi.fn() }
    mockFileSystemManager.watchFiles = vi.fn().mockReturnValue(mockWatcher)
    
    // Simulate creating a watcher
    const handler = ipcHandler as any
    handler.activeWatchers.set('test-watcher', mockWatcher)
    
    // Cleanup should close the watcher
    ipcHandler.cleanup()
    
    expect(mockWatcher.close).toHaveBeenCalled()
  })

  it('should have all required handler methods', () => {
    const handler = ipcHandler as any
    
    // Check that private handler methods exist
    const expectedMethods = [
      'handleFileRead',
      'handleFileWrite',
      'handleFileDelete',
      'handleFileExists',
      'handleFileWatch',
      'handleFileUnwatch',
      'handleDirCreate',
      'handleDirRead',
      'handleProjectCreate',
      'handleProjectLoad',
      'handleProjectStructure',
      'handleProjectValidate',
      'handleProcessExecute',
      'handleProcessKill',
      'handleProcessList',
      'handleTerminalCreate',
      'handleTerminalInput',
      'handleTerminalResize',
      'handleTerminalClose',
      'handleTerminalList',
      'handleBuildProgram',
      'handleBuildClean',
      'handleBuildCancel',
      'handleDeployProgram',
      'handleTestRun',
      'handleTestDebug',
      'handleTestCancel',
      'handleWorkspaceSave',
      'handleWorkspaceLoad',
      'handleWorkspaceRecent',
      'handleWorkspaceSetActive',
      'handleToolchainDetect',
      'handleToolchainValidate',
      'handleToolchainInstall'
    ]
    
    expectedMethods.forEach(method => {
      expect(typeof handler[method]).toBe('function')
    })
  })

  it('should have proper error handling utilities', () => {
    const handler = ipcHandler as any
    
    expect(typeof handler.getErrorCode).toBe('function')
    expect(typeof handler.getSuggestedActions).toBe('function')
  })
})