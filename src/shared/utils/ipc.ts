// Type-safe IPC utility functions

import {
  IPCRequest,
  IPCResponse,
  IPCEvent,
  IPCError,
  IPCChannelName,
  IPCEventChannelName,
  RequestDataForChannel,
  ResponseDataForChannel,
  EventDataForChannel,
  createIPCRequest,
  createIPCResponse,
  createIPCEvent,
  createIPCError,
  validateIPCRequest,
  validateIPCResponse,
  validateIPCEvent,
  IPCErrorCode
} from '../types/IPC'

// IPC timeout configuration
export const IPC_TIMEOUT = {
  DEFAULT: 5000,
  FILE_OPERATIONS: 10000,
  BUILD_OPERATIONS: 60000,
  TEST_OPERATIONS: 120000,
  DEPLOY_OPERATIONS: 180000
} as const

// IPC retry configuration
export const IPC_RETRY = {
  MAX_ATTEMPTS: 3,
  DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2
} as const

// Type-safe IPC request wrapper
export class IPCRequestWrapper<T extends IPCChannelName> {
  constructor(
    private channel: T,
    private sendRequest: (request: IPCRequest<RequestDataForChannel<T>>) => Promise<IPCResponse<ResponseDataForChannel<T>>>,
    private timeout: number = IPC_TIMEOUT.DEFAULT
  ) {}

  async send(data: RequestDataForChannel<T>): Promise<ResponseDataForChannel<T>> {
    const request = createIPCRequest(this.channel, data)
    
    try {
      const response = await this.sendWithTimeout(request)
      
      if (!validateIPCResponse(response, this.channel)) {
        throw new Error(`Invalid response format for channel ${this.channel}`)
      }

      if (!response.success) {
        throw new IPCRequestError(response.error!)
      }

      return response.data!
    } catch (error) {
      if (error instanceof IPCRequestError) {
        throw error
      }
      
      throw new IPCRequestError(createIPCError(
        'UNKNOWN_ERROR',
        `IPC request failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        true,
        ['Check network connection', 'Retry the operation']
      ))
    }
  }

  async sendWithRetry(
    data: RequestDataForChannel<T>,
    maxAttempts: number = IPC_RETRY.MAX_ATTEMPTS
  ): Promise<ResponseDataForChannel<T>> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.send(data)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (error instanceof IPCRequestError && !error.isRecoverable()) {
          throw error
        }
        
        if (attempt < maxAttempts) {
          const delay = IPC_RETRY.DELAY_MS * Math.pow(IPC_RETRY.BACKOFF_MULTIPLIER, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed')
  }

  private async sendWithTimeout(
    request: IPCRequest<RequestDataForChannel<T>>
  ): Promise<IPCResponse<ResponseDataForChannel<T>>> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new IPCRequestError(createIPCError(
          'TIMEOUT_ERROR',
          `IPC request timed out after ${this.timeout}ms`,
          `Channel: ${this.channel}`,
          true,
          ['Increase timeout', 'Check system performance']
        )))
      }, this.timeout)

      this.sendRequest(request)
        .then(response => {
          clearTimeout(timeoutId)
          resolve(response)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }
}

// Type-safe IPC event wrapper
export class IPCEventWrapper<T extends IPCEventChannelName> {
  constructor(
    private channel: T,
    private sendEvent: (event: IPCEvent<EventDataForChannel<T>>) => void
  ) {}

  send(data: EventDataForChannel<T>): void {
    const event = createIPCEvent(this.channel, data)
    
    if (!validateIPCEvent(event, this.channel)) {
      throw new Error(`Invalid event format for channel ${this.channel}`)
    }

    this.sendEvent(event)
  }
}

// Custom error class for IPC operations
export class IPCRequestError extends Error {
  constructor(public readonly ipcError: IPCError) {
    super(ipcError.message)
    this.name = 'IPCRequestError'
  }

  getCode(): IPCErrorCode {
    return this.ipcError.code as IPCErrorCode
  }

  getDetails(): string | undefined {
    return this.ipcError.details
  }

  getSuggestedActions(): string[] {
    return this.ipcError.suggestedActions || []
  }

  isRecoverable(): boolean {
    return this.ipcError.recoverable
  }

  getFormattedMessage(): string {
    let message = `[${this.ipcError.code}] ${this.ipcError.message}`
    if (this.ipcError.details) {
      message += `\nDetails: ${this.ipcError.details}`
    }
    if (this.ipcError.suggestedActions && this.ipcError.suggestedActions.length > 0) {
      message += `\nSuggested actions:\n${this.ipcError.suggestedActions.map(action => `- ${action}`).join('\n')}`
    }
    return message
  }
}

// IPC request queue for managing concurrent requests
export class IPCRequestQueue {
  private queue: Array<{
    request: IPCRequest<any>
    resolve: (response: IPCResponse<any>) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }> = []

  private maxConcurrent: number = 10
  private activeRequests = new Map<string, {
    resolve: (response: IPCResponse<any>) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }>()

  constructor(maxConcurrent: number = 10) {
    this.maxConcurrent = maxConcurrent
  }

  async enqueue<T extends IPCChannelName>(
    channel: T,
    data: RequestDataForChannel<T>,
    timeout: number = IPC_TIMEOUT.DEFAULT
  ): Promise<ResponseDataForChannel<T>> {
    const request = createIPCRequest(channel, data)

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeFromActive(request.id)
        reject(new IPCRequestError(createIPCError(
          'TIMEOUT_ERROR',
          `IPC request timed out after ${timeout}ms`,
          `Channel: ${channel}`,
          true
        )))
      }, timeout)

      if (this.activeRequests.size < this.maxConcurrent) {
        this.processRequest(request, resolve, reject, timeoutId)
      } else {
        this.queue.push({
          request,
          resolve,
          reject,
          timeout: timeoutId
        })
      }
    })
  }

  handleResponse(response: IPCResponse<any>): void {
    const activeRequest = this.activeRequests.get(response.id)
    if (activeRequest) {
      clearTimeout(activeRequest.timeout)
      this.removeFromActive(response.id)
      
      if (response.success) {
        activeRequest.resolve(response)
      } else {
        activeRequest.reject(new IPCRequestError(response.error!))
      }

      this.processQueue()
    }
  }

  private processRequest(
    request: IPCRequest<any>,
    resolve: (response: IPCResponse<any>) => void,
    reject: (error: Error) => void,
    timeout: NodeJS.Timeout
  ): void {
    this.activeRequests.set(request.id, { resolve, reject, timeout })
    // The actual sending would be handled by the IPC implementation
  }

  private removeFromActive(requestId: string): void {
    this.activeRequests.delete(requestId)
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.activeRequests.size < this.maxConcurrent) {
      const { request, resolve, reject, timeout } = this.queue.shift()!
      this.processRequest(request, resolve, reject, timeout)
    }
  }

  clear(): void {
    // Clear all pending requests
    this.queue.forEach(({ reject, timeout }) => {
      clearTimeout(timeout)
      reject(new IPCRequestError(createIPCError(
        'UNKNOWN_ERROR',
        'Request queue cleared',
        undefined,
        false
      )))
    })
    this.queue = []

    // Clear all active requests
    this.activeRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout)
      reject(new IPCRequestError(createIPCError(
        'UNKNOWN_ERROR',
        'Request queue cleared',
        undefined,
        false
      )))
    })
    this.activeRequests.clear()
  }

  getQueueSize(): number {
    return this.queue.length
  }

  getActiveRequestCount(): number {
    return this.activeRequests.size
  }
}

// Utility functions for common IPC operations
export function createSuccessResponse<T extends IPCChannelName>(
  requestId: string,
  data: ResponseDataForChannel<T>
): IPCResponse<ResponseDataForChannel<T>> {
  return createIPCResponse(requestId, true, data)
}

export function createErrorResponse<T extends IPCChannelName>(
  requestId: string,
  error: IPCError
): IPCResponse<ResponseDataForChannel<T>> {
  return createIPCResponse(requestId, false, undefined, error)
}

export function createFileSystemError(message: string, path?: string): IPCError {
  return createIPCError(
    'FILE_NOT_FOUND',
    message,
    path ? `Path: ${path}` : undefined,
    true,
    ['Check file path', 'Verify file permissions']
  )
}

export function createProcessError(message: string, command?: string): IPCError {
  return createIPCError(
    'PROCESS_FAILED',
    message,
    command ? `Command: ${command}` : undefined,
    true,
    ['Check command syntax', 'Verify executable exists']
  )
}

export function createValidationError(message: string, field?: string): IPCError {
  return createIPCError(
    'VALIDATION_ERROR',
    message,
    field ? `Field: ${field}` : undefined,
    true,
    ['Check input format', 'Verify required fields']
  )
}