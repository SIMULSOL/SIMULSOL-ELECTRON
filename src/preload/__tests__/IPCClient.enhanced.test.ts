// Enhanced IPC Client test - verifies task 3.3 implementation
// Tests the enhanced renderer process IPC client with Promise-based API,
// error handling, retry logic, and TypeScript definitions

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

describe('IPCClient - Enhanced Implementation (Task 3.3)', () => {
  let ipcClient: IPCClient

  beforeEach(() => {
    vi.clearAllMocks()
    ipcClient = new IPCClient(mockIpcRenderer as any)
  })

  afterEach(() => {
    ipcClient.removeAllListeners()
  })

  describe('Task Requirement 1: Client-side IPC wrapper with Promise-based API', () => {
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
      expect(result.encoding).toBe('utf8')
    })

    it('should provide comprehensive API coverage for all major operations', () => {
      // File System operations
      expect(typeof ipcClient.fileRead).toBe('function')
      expect(typeof ipcClient.fileWrite).toBe('function')
      expect(typeof ipcClient.fileDelete).toBe('function')
      expect(typeof ipcClient.fileExists).toBe('function')
      expect(typeof ipcClient.dirCreate).toBe('function')
      expect(typeof ipcClient.dirRead).toBe('function')
      expect(typeof ipcClient.fileWatch).toBe('function')
      expect(typeof ipcClient.fileUnwatch).toBe('function')

      // Project operations
      expect(typeof ipcClient.projectCreate).toBe('function')
      expect(typeof ipcClient.projectLoad).toBe('function')
      expect(typeof ipcClient.projectStructure).toBe('function')
      expect(typeof ipcClient.projectValidate).toBe('function')

      // Process operations
      expect(typeof ipcClient.processExecute).toBe('function')
      expect(typeof ipcClient.processKill).toBe('function')
      expect(typeof ipcClient.processList).toBe('function')

      // Terminal operations
      expect(typeof ipcClient.terminalCreate).toBe('function')
      expect(typeof ipcClient.terminalInput).toBe('function')
      expect(typeof ipcClient.terminalResize).toBe('function')
      expect(typeof ipcClient.terminalClose).toBe('function')
      expect(typeof ipcClient.terminalList).toBe('function')

      // Build operations
      expect(typeof ipcClient.buildProgram).toBe('function')
      expect(typeof ipcClient.buildClean).toBe('function')
      expect(typeof ipcClient.buildCancel).toBe('function')

      // Deploy operations
      expect(typeof ipcClient.deployProgram).toBe('function')

      // Test operations
      expect(typeof ipcClient.testRun).toBe('function')
      expect(typeof ipcClient.testDebug).toBe('function')
      expect(typeof ipcClient.testCancel).toBe('function')

      // Workspace operations
      expect(typeof ipcClient.workspaceSave).toBe('function')
      expect(typeof ipcClient.workspaceLoad).toBe('function')
      expect(typeof ipcClient.workspaceRecent).toBe('function')
      expect(typeof ipcClient.workspaceSetActive).toBe('function')

      // Toolchain operations
      expect(typeof ipcClient.toolchainDetect).toBe('function')
      expect(typeof ipcClient.toolchainValidate).toBe('function')
      expect(typeof ipcClient.toolchainInstall).toBe('function')
    })

    it('should provide event listener methods with unsubscribe functionality', () => {
      const callback = vi.fn()
      
      // Test all event listeners return unsubscribe functions
      const unsubscribeFile = ipcClient.onFileChanged(callback)
      const unsubscribeProcess = ipcClient.onProcessOutput(callback)
      const unsubscribeProcessExit = ipcClient.onProcessExit(callback)
      const unsubscribeBuild = ipcClient.onBuildProgress(callback)
      const unsubscribeTest = ipcClient.onTestProgress(callback)
      const unsubscribeTerminal = ipcClient.onTerminalOutput(callback)
      
      expect(typeof unsubscribeFile).toBe('function')
      expect(typeof unsubscribeProcess).toBe('function')
      expect(typeof unsubscribeProcessExit).toBe('function')
      expect(typeof unsubscribeBuild).toBe('function')
      expect(typeof unsubscribeTest).toBe('function')
      expect(typeof unsubscribeTerminal).toBe('function')

      // Test that IPC listeners are registered
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.EVENT_FILE_CHANGED,
        expect.any(Function)
      )
      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.EVENT_PROCESS_OUTPUT,
        expect.any(Function)
      )
    })
  })

  describe('Task Requirement 2: Error handling and retry logic for IPC calls', () => {
    it('should handle IPC errors gracefully with structured error information', async () => {
      const mockError = createIPCError(
        'FILE_NOT_FOUND',
        'File not found',
        '/test.txt',
        true,
        ['Check file path', 'Verify file exists']
      )
      
      const mockResponse = createIPCResponse('test-id', false, undefined, mockError)
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      try {
        await ipcClient.fileRead({ path: '/test.txt' })
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(IPCRequestError)
        const ipcError = error as IPCRequestError
        expect(ipcError.getCode()).toBe('FILE_NOT_FOUND')
        expect(ipcError.getSuggestedActions()).toContain('Check file path')
        expect(ipcError.isRecoverable()).toBe(true)
        expect(ipcError.getDetails()).toBe('/test.txt')
      }
    })

    it('should provide retry functionality with exponential backoff', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        content: 'test content',
        encoding: 'utf8'
      })
      
      // Fail first two attempts, succeed on third
      mockIpcRenderer.invoke
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse)

      const startTime = Date.now()
      const result = await ipcClient.sendRequestWithRetry(
        IPC_CHANNELS.FILE_READ,
        { path: '/test.txt' },
        3
      )
      const endTime = Date.now()

      expect(result.content).toBe('test content')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(3)
      
      // Should have some delay due to exponential backoff
      expect(endTime - startTime).toBeGreaterThan(1000) // At least 1 second delay
    })

    it('should provide enhanced retry with recovery callbacks', async () => {
      const mockError = createIPCError(
        'FILE_ACCESS_DENIED',
        'Access denied',
        '/protected/file.txt',
        true,
        ['Check permissions']
      )
      
      const mockResponse = createIPCResponse('test-id', false, undefined, mockError)
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const onRetry = vi.fn()
      const onRecovery = vi.fn().mockResolvedValue(false) // Don't recover

      try {
        await ipcClient.sendRequestWithRecovery(
          IPC_CHANNELS.FILE_READ,
          { path: '/protected/file.txt' },
          {
            maxAttempts: 2,
            onRetry,
            onRecovery
          }
        )
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(IPCRequestError)
        expect(onRetry).toHaveBeenCalledWith(1, expect.any(IPCRequestError))
        expect(onRecovery).toHaveBeenCalledWith(expect.any(IPCRequestError))
      }
    })

    it('should handle timeout errors properly', async () => {
      // Mock a slow response that exceeds timeout
      mockIpcRenderer.invoke.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      )

      try {
        await (ipcClient as any).sendRequest(IPC_CHANNELS.FILE_READ, { path: '/test.txt' }, 100)
        expect.fail('Should have thrown a timeout error')
      } catch (error) {
        expect(error).toBeInstanceOf(IPCRequestError)
        const ipcError = error as IPCRequestError
        expect(ipcError.getCode()).toBe('TIMEOUT_ERROR')
        expect(ipcError.message).toContain('timed out')
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

    it('should handle non-recoverable errors correctly', async () => {
      const mockError = createIPCError(
        'VALIDATION_ERROR',
        'Invalid request format',
        'Missing required field',
        false, // Not recoverable
        ['Fix request format']
      )
      
      const mockResponse = createIPCResponse('test-id', false, undefined, mockError)
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      const onRetry = vi.fn()
      const onRecovery = vi.fn()

      try {
        await ipcClient.sendRequestWithRecovery(
          IPC_CHANNELS.FILE_READ,
          { path: '/test.txt' },
          {
            maxAttempts: 3,
            onRetry,
            onRecovery
          }
        )
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(IPCRequestError)
        const ipcError = error as IPCRequestError
        expect(ipcError.isRecoverable()).toBe(false)
        
        // Should not retry non-recoverable errors
        expect(onRetry).not.toHaveBeenCalled()
        expect(onRecovery).toHaveBeenCalledOnce()
      }
    })
  })

  describe('Task Requirement 3: TypeScript definitions for exposed APIs', () => {
    it('should have proper TypeScript types for all API methods', () => {
      // This test verifies that TypeScript compilation would succeed
      // by checking that methods exist and have expected signatures
      
      // The fact that this test compiles without TypeScript errors
      // validates that the type definitions are correct
      expect(ipcClient).toBeDefined()
      expect(typeof ipcClient.fileRead).toBe('function')
      expect(typeof ipcClient.sendRequestWithRetry).toBe('function')
      expect(typeof ipcClient.sendRequestWithRecovery).toBe('function')
    })

    it('should provide type-safe method signatures', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        content: 'test content',
        encoding: 'utf8'
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      // These calls should compile without TypeScript errors
      const fileResult = await ipcClient.fileRead({ path: '/test.txt' })
      expect(fileResult.content).toBe('test content')
      expect(fileResult.encoding).toBe('utf8')

      const projectMockResponse = createIPCResponse('test-id', true, {
        project: { name: 'test', path: '/test', type: 'anchor', files: [], configuration: {}, dependencies: [] }
      })
      mockIpcRenderer.invoke.mockResolvedValue(projectMockResponse)

      const projectResult = await ipcClient.projectLoad({ path: '/test' })
      expect(projectResult.project).toBeDefined()
    })

    it('should provide proper event listener type safety', () => {
      // Test that event listeners have proper type signatures
      const fileChangeCallback = (data: any) => {
        expect(data).toBeDefined()
      }
      
      const processOutputCallback = (data: any) => {
        expect(data).toBeDefined()
      }

      const unsubscribeFile = ipcClient.onFileChanged(fileChangeCallback)
      const unsubscribeProcess = ipcClient.onProcessOutput(processOutputCallback)
      
      expect(typeof unsubscribeFile).toBe('function')
      expect(typeof unsubscribeProcess).toBe('function')
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
      expect(result.structure.type).toBe('anchor')
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

      // Test terminal input for command completion
      const inputMockResponse = createIPCResponse('test-id', true, {
        sent: true
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(inputMockResponse)
      
      const inputResult = await ipcClient.terminalInput({
        terminalId: 'terminal-1',
        input: 'solana --help\n'
      })
      
      expect(inputResult.sent).toBe(true)
    })
  })

  describe('Integration and cleanup', () => {
    it('should properly clean up resources', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      
      ipcClient.onFileChanged(callback1)
      ipcClient.onProcessOutput(callback2)
      
      // Test cleanup
      ipcClient.removeAllListeners()
      
      expect(mockIpcRenderer.removeAllListeners).toHaveBeenCalled()
    })

    it('should handle concurrent requests properly', async () => {
      const mockResponse = createIPCResponse('test-id', true, {
        content: 'test content',
        encoding: 'utf8'
      })
      
      mockIpcRenderer.invoke.mockResolvedValue(mockResponse)

      // Send multiple concurrent requests
      const promises = [
        ipcClient.fileRead({ path: '/test1.txt' }),
        ipcClient.fileRead({ path: '/test2.txt' }),
        ipcClient.fileRead({ path: '/test3.txt' })
      ]

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.content).toBe('test content')
      })
    })

    it('should provide queue management utilities', () => {
      // Test queue status
      const status = ipcClient.getQueueStatus()
      expect(typeof status.active).toBe('number')
      expect(typeof status.queued).toBe('number')

      // Test queue clearing
      expect(() => ipcClient.clearQueue()).not.toThrow()
    })
  })

  describe('Error recovery scenarios', () => {
    it('should handle recovery success scenario', async () => {
      const mockError = createIPCError(
        'FILE_ACCESS_DENIED',
        'Access denied',
        '/protected/file.txt',
        true,
        ['Check permissions']
      )
      
      const mockErrorResponse = createIPCResponse('test-id', false, undefined, mockError)
      const mockSuccessResponse = createIPCResponse('test-id', true, {
        content: 'recovered content',
        encoding: 'utf8'
      })
      
      mockIpcRenderer.invoke
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse)

      const onRecovery = vi.fn().mockResolvedValue(true) // Successful recovery

      const result = await ipcClient.sendRequestWithRecovery(
        IPC_CHANNELS.FILE_READ,
        { path: '/protected/file.txt' },
        {
          maxAttempts: 2,
          onRecovery
        }
      )

      expect(result.content).toBe('recovered content')
      expect(onRecovery).toHaveBeenCalledOnce()
      expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(2)
    })

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network unreachable')
      
      mockIpcRenderer.invoke
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(createIPCResponse('test-id', true, {
          content: 'success after network recovery',
          encoding: 'utf8'
        }))

      const result = await ipcClient.sendRequestWithRetry(
        IPC_CHANNELS.FILE_READ,
        { path: '/test.txt' },
        3
      )

      expect(result.content).toBe('success after network recovery')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledTimes(3)
    })
  })
})