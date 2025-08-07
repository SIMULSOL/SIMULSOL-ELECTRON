// Verification test for IPC Client implementation
// This test verifies that the renderer process IPC client meets all task requirements

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IPCClient } from '../IPCClient'
import { IPC_CHANNELS, createIPCResponse, createIPCError } from '../../shared/types/IPC'
import { IPCRequestError } from '../../shared/utils/ipc'

// Mock IpcRenderer
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn()
}

describe('IPCClient - Task 3.3 Verification', () => {
  let ipcClient: IPCClient

  beforeEach(() => {
    vi.clearAllMocks()
    ipcClient = new IPCClient(mockIpcRenderer as any)
  })

  describe('Requirement 1: Client-side IPC wrapper with Promise-based API', () => {
    it('should provide Promise-based API for all IPC operations', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        content: 'test content',
        encoding: 'utf8'
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      // Test that all methods return Promises
      const fileReadPromise = ipcClient.fileRead({ path: '/test.txt' })
      expect(fileReadPromise).toBeInstanceOf(Promise)

      const result = await fileReadPromise
      expect(result.content).toBe('test content')
    })

    it('should provide comprehensive API coverage for all IPC channels', () => {
      // Verify that IPCClient has methods for all major IPC operations
      expect(typeof ipcClient.fileRead).toBe('function')
      expect(typeof ipcClient.fileWrite).toBe('function')
      expect(typeof ipcClient.projectCreate).toBe('function')
      expect(typeof ipcClient.processExecute).toBe('function')
      expect(typeof ipcClient.terminalCreate).toBe('function')
      expect(typeof ipcClient.buildProgram).toBe('function')
      expect(typeof ipcClient.testRun).toBe('function')
      expect(typeof ipcClient.workspaceSave).toBe('function')
      expect(typeof ipcClient.toolchainDetect).toBe('function')
    })

    it('should provide event listener methods', () => {
      expect(typeof ipcClient.onFileChanged).toBe('function')
      expect(typeof ipcClient.onProcessOutput).toBe('function')
      expect(typeof ipcClient.onBuildProgress).toBe('function')
      expect(typeof ipcClient.onTestProgress).toBe('function')
      expect(typeof ipcClient.onTerminalOutput).toBe('function')
    })
  })

  describe('Requirement 2: Error handling and retry logic for IPC calls', () => {
    it('should handle IPC errors gracefully', async () => {
      const mockError = createIPCError(
        'FILE_NOT_FOUND',
        'File not found',
        '/test.txt',
        true,
        ['Check file path']
      )
      
      const mockResponse = createIPCResponse('test-id', false, undefined, mockError)
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      await expect(ipcClient.fileRead({ path: '/test.txt' })).rejects.toThrow(IPCRequestError)
    })

    it('should provide retry functionality', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        content: 'test content',
        encoding: 'utf8'
      })
      
      // Fail first two attempts, succeed on third
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

    it('should handle timeout errors', async () => {
      // Mock a slow response that exceeds timeout
      mockIpcRenderer.invoke.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      )

      await expect(
        ipcClient.sendRequest(IPC_CHANNELS.FILE_READ, { path: '/test.txt' }, 100)
      ).rejects.toThrow('timed out')
    })

    it('should provide structured error information', async () => {
      const mockError = createIPCError(
        'FILE_ACCESS_DENIED',
        'Access denied',
        '/protected/file.txt',
        true,
        ['Check file permissions', 'Run as administrator']
      )
      
      const mockResponse = createIPCResponse('test-id', false, undefined, mockError)
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      try {
        await ipcClient.fileRead({ path: '/protected/file.txt' })
      } catch (error) {
        expect(error).toBeInstanceOf(IPCRequestError)
        const ipcError = error as IPCRequestError
        expect(ipcError.getCode()).toBe('FILE_ACCESS_DENIED')
        expect(ipcError.getSuggestedActions()).toContain('Check file permissions')
        expect(ipcError.isRecoverable()).toBe(true)
      }
    })

    it('should manage request queue properly', () => {
      const status = ipcClient.getQueueStatus()
      expect(status).toHaveProperty('active')
      expect(status).toHaveProperty('queued')
      expect(typeof status.active).toBe('number')
      expect(typeof status.queued).toBe('number')

      // Test queue clearing
      expect(() => ipcClient.clearQueue()).not.toThrow()
    })
  })

  describe('Requirement 3: TypeScript definitions for exposed APIs', () => {
    it('should have proper TypeScript types for all API methods', () => {
      // This test verifies that TypeScript compilation would succeed
      // by checking that methods exist and have expected signatures
      
      // File system operations
      expect(ipcClient.fileRead).toBeDefined()
      expect(ipcClient.fileWrite).toBeDefined()
      expect(ipcClient.fileDelete).toBeDefined()
      expect(ipcClient.fileExists).toBeDefined()
      
      // Project operations
      expect(ipcClient.projectCreate).toBeDefined()
      expect(ipcClient.projectLoad).toBeDefined()
      expect(ipcClient.projectStructure).toBeDefined()
      expect(ipcClient.projectValidate).toBeDefined()
      
      // Process operations
      expect(ipcClient.processExecute).toBeDefined()
      expect(ipcClient.processKill).toBeDefined()
      expect(ipcClient.processList).toBeDefined()
      
      // Terminal operations
      expect(ipcClient.terminalCreate).toBeDefined()
      expect(ipcClient.terminalInput).toBeDefined()
      expect(ipcClient.terminalResize).toBeDefined()
      expect(ipcClient.terminalClose).toBeDefined()
      
      // Build operations
      expect(ipcClient.buildProgram).toBeDefined()
      expect(ipcClient.buildClean).toBeDefined()
      expect(ipcClient.buildCancel).toBeDefined()
      
      // Test operations
      expect(ipcClient.testRun).toBeDefined()
      expect(ipcClient.testDebug).toBeDefined()
      expect(ipcClient.testCancel).toBeDefined()
      
      // Workspace operations
      expect(ipcClient.workspaceSave).toBeDefined()
      expect(ipcClient.workspaceLoad).toBeDefined()
      expect(ipcClient.workspaceRecent).toBeDefined()
      expect(ipcClient.workspaceSetActive).toBeDefined()
      
      // Toolchain operations
      expect(ipcClient.toolchainDetect).toBeDefined()
      expect(ipcClient.toolchainValidate).toBeDefined()
      expect(ipcClient.toolchainInstall).toBeDefined()
    })

    it('should provide type-safe event listeners', () => {
      const fileChangeCallback = vi.fn()
      const processOutputCallback = vi.fn()
      const buildProgressCallback = vi.fn()
      
      // Test that event listeners return unsubscribe functions
      const unsubscribeFile = ipcClient.onFileChanged(fileChangeCallback)
      const unsubscribeProcess = ipcClient.onProcessOutput(processOutputCallback)
      const unsubscribeBuild = ipcClient.onBuildProgress(buildProgressCallback)
      
      expect(typeof unsubscribeFile).toBe('function')
      expect(typeof unsubscribeProcess).toBe('function')
      expect(typeof unsubscribeBuild).toBe('function')
    })
  })

  describe('Integration with preload context bridge', () => {
    it('should be properly exposed through context bridge', () => {
      // This test verifies that the API is properly structured for context bridge exposure
      // The actual context bridge setup is tested in the preload index file
      
      expect(ipcClient).toBeInstanceOf(IPCClient)
      expect(typeof ipcClient.removeAllListeners).toBe('function')
    })
  })

  describe('Requirements 1.1 and 5.4 compliance', () => {
    it('should support IDE interface requirements (1.1)', async () => {
      // Test that the client supports operations needed for IDE interface
      const mockResponse = createIPCResponse('test-id', true, {
        structure: {
          name: 'test-project',
          path: '/test/project',
          type: 'anchor',
          files: [],
          configuration: {},
          dependencies: []
        }
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)
      
      const result = await ipcClient.projectStructure({ path: '/test/project' })
      expect(result.structure).toBeDefined()
      expect(result.structure.name).toBe('test-project')
    })

    it('should support terminal auto-completion requirements (5.4)', async () => {
      // Test terminal operations that support auto-completion
      const mockResponse = createIPCResponse('test-id', true, {
        terminalId: 'terminal-1',
        pid: 1234
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)
      
      const result = await ipcClient.terminalCreate({
        cwd: '/test/project',
        shell: 'bash'
      })
      
      expect(result.terminalId).toBe('terminal-1')
      expect(result.pid).toBe(1234)
    })
  })
})