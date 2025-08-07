// Tests for IPC utility functions

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  IPCRequestWrapper,
  IPCEventWrapper,
  IPCRequestError,
  IPCRequestQueue,
  createSuccessResponse,
  createErrorResponse,
  createFileSystemError,
  createProcessError,
  createValidationError,
  IPC_TIMEOUT
} from '../ipc'
import {
  IPC_CHANNELS,
  createIPCRequest,
  createIPCResponse,
  createIPCError,
  FileReadRequest,
  FileReadResponse
} from '../../types/IPC'

describe('IPC Utility Functions', () => {
  describe('IPCRequestWrapper', () => {
    let mockSendRequest: ReturnType<typeof vi.fn>
    let wrapper: IPCRequestWrapper<typeof IPC_CHANNELS.FILE_READ>

    beforeEach(() => {
      mockSendRequest = vi.fn()
      wrapper = new IPCRequestWrapper(
        IPC_CHANNELS.FILE_READ,
        mockSendRequest,
        1000
      )
    })

    it('should send successful request', async () => {
      const requestData: FileReadRequest = { path: '/test/file.txt' }
      const responseData: FileReadResponse = { content: 'test content', encoding: 'utf8' }
      
      mockSendRequest.mockResolvedValue(
        createSuccessResponse('test-id', responseData)
      )

      const result = await wrapper.send(requestData)
      
      expect(result).toEqual(responseData)
      expect(mockSendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: IPC_CHANNELS.FILE_READ,
          data: requestData
        })
      )
    })

    it('should handle error response', async () => {
      const requestData: FileReadRequest = { path: '/test/file.txt' }
      const error = createFileSystemError('File not found', '/test/file.txt')
      
      mockSendRequest.mockResolvedValue(
        createErrorResponse('test-id', error)
      )

      await expect(wrapper.send(requestData)).rejects.toThrow(IPCRequestError)
    })

    it('should handle timeout', async () => {
      const requestData: FileReadRequest = { path: '/test/file.txt' }
      
      mockSendRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      )

      await expect(wrapper.send(requestData)).rejects.toThrow('timed out')
    })

    it('should retry on recoverable errors', async () => {
      const requestData: FileReadRequest = { path: '/test/file.txt' }
      const responseData: FileReadResponse = { content: 'test content', encoding: 'utf8' }
      
      mockSendRequest
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createSuccessResponse('test-id', responseData))

      const result = await wrapper.sendWithRetry(requestData, 3)
      
      expect(result).toEqual(responseData)
      expect(mockSendRequest).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-recoverable errors', async () => {
      const requestData: FileReadRequest = { path: '/test/file.txt' }
      const error = createIPCError('VALIDATION_ERROR', 'Invalid path', undefined, false)
      
      mockSendRequest.mockResolvedValue(
        createErrorResponse('test-id', error)
      )

      await expect(wrapper.sendWithRetry(requestData, 3)).rejects.toThrow(IPCRequestError)
      expect(mockSendRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('IPCEventWrapper', () => {
    it('should send event successfully', () => {
      const mockSendEvent = vi.fn()
      const wrapper = new IPCEventWrapper(IPC_CHANNELS.EVENT_FILE_CHANGED, mockSendEvent)
      
      const eventData = {
        path: '/test/file.txt',
        type: 'modified' as const
      }

      wrapper.send(eventData)
      
      expect(mockSendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: IPC_CHANNELS.EVENT_FILE_CHANGED,
          data: eventData
        })
      )
    })
  })

  describe('IPCRequestError', () => {
    it('should create error with proper properties', () => {
      const ipcError = createFileSystemError('File not found', '/test/file.txt')
      const error = new IPCRequestError(ipcError)
      
      expect(error.message).toBe('File not found')
      expect(error.getCode()).toBe('FILE_NOT_FOUND')
      expect(error.getDetails()).toBe('Path: /test/file.txt')
      expect(error.isRecoverable()).toBe(true)
      expect(error.getSuggestedActions()).toEqual(['Check file path', 'Verify file permissions'])
    })

    it('should format error message correctly', () => {
      const ipcError = createValidationError('Invalid input', 'username')
      const error = new IPCRequestError(ipcError)
      
      const formatted = error.getFormattedMessage()
      
      expect(formatted).toContain('[VALIDATION_ERROR]')
      expect(formatted).toContain('Invalid input')
      expect(formatted).toContain('Field: username')
      expect(formatted).toContain('Suggested actions:')
    })
  })

  describe('IPCRequestQueue', () => {
    let queue: IPCRequestQueue

    beforeEach(() => {
      queue = new IPCRequestQueue(2) // Max 2 concurrent requests
    })

    afterEach(() => {
      queue.clear()
    })

    it('should process requests within concurrency limit', async () => {
      const promise1 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file1.txt' })
      const promise2 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file2.txt' })
      
      expect(queue.getActiveRequestCount()).toBe(2)
      expect(queue.getQueueSize()).toBe(0)

      // Third request should be queued
      const promise3 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file3.txt' })
      
      expect(queue.getActiveRequestCount()).toBe(2)
      expect(queue.getQueueSize()).toBe(1)
    })

    it('should handle response and process queue', () => {
      const promise1 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file1.txt' })
      const promise2 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file2.txt' })
      const promise3 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file3.txt' })
      
      expect(queue.getActiveRequestCount()).toBe(2)
      expect(queue.getQueueSize()).toBe(1)

      // Simulate response for first request
      const response = createSuccessResponse('test-id', { content: 'test', encoding: 'utf8' })
      queue.handleResponse(response)
      
      expect(queue.getActiveRequestCount()).toBe(2) // Third request should now be active
      expect(queue.getQueueSize()).toBe(0)
    })

    it('should clear all requests', () => {
      const promise1 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file1.txt' })
      const promise2 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file2.txt' })
      const promise3 = queue.enqueue(IPC_CHANNELS.FILE_READ, { path: '/file3.txt' })
      
      queue.clear()
      
      expect(queue.getActiveRequestCount()).toBe(0)
      expect(queue.getQueueSize()).toBe(0)
    })
  })

  describe('Error creation utilities', () => {
    it('should create file system error', () => {
      const error = createFileSystemError('Access denied', '/protected/file.txt')
      
      expect(error.code).toBe('FILE_NOT_FOUND')
      expect(error.message).toBe('Access denied')
      expect(error.details).toBe('Path: /protected/file.txt')
      expect(error.recoverable).toBe(true)
    })

    it('should create process error', () => {
      const error = createProcessError('Command failed', 'cargo build')
      
      expect(error.code).toBe('PROCESS_FAILED')
      expect(error.message).toBe('Command failed')
      expect(error.details).toBe('Command: cargo build')
      expect(error.recoverable).toBe(true)
    })

    it('should create validation error', () => {
      const error = createValidationError('Required field missing', 'projectName')
      
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Required field missing')
      expect(error.details).toBe('Field: projectName')
      expect(error.recoverable).toBe(true)
    })
  })

  describe('Response creation utilities', () => {
    it('should create success response', () => {
      const data: FileReadResponse = { content: 'test content', encoding: 'utf8' }
      const response = createSuccessResponse('test-id', data)
      
      expect(response.id).toBe('test-id')
      expect(response.success).toBe(true)
      expect(response.data).toEqual(data)
      expect(response.error).toBeUndefined()
    })

    it('should create error response', () => {
      const error = createFileSystemError('File not found')
      const response = createErrorResponse('test-id', error)
      
      expect(response.id).toBe('test-id')
      expect(response.success).toBe(false)
      expect(response.data).toBeUndefined()
      expect(response.error).toEqual(error)
    })
  })
})