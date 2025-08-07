// Renderer process IPC client implementation

import { IpcRenderer } from 'electron'
import {
  IPCRequest,
  IPCResponse,
  IPCChannelName,
  IPC_CHANNELS,
  RequestDataForChannel,
  ResponseDataForChannel,
  IPCEventChannelName,
  EventDataForChannel,
  createIPCRequest,
  validateIPCResponse,
  generateRequestId
} from '../shared/types/IPC'
import {
  IPCRequestWrapper,
  IPCRequestError,
  IPCRequestQueue,
  IPC_TIMEOUT
} from '../shared/utils/ipc'

export class IPCClient {
  private ipcRenderer: IpcRenderer
  private requestQueue: IPCRequestQueue
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map()

  constructor(ipcRenderer: IpcRenderer) {
    this.ipcRenderer = ipcRenderer
    this.requestQueue = new IPCRequestQueue(10) // Max 10 concurrent requests
    
    this.setupEventListeners()
  }

  // File System methods
  async fileRead(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_READ>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_READ>> {
    return this.sendRequest(IPC_CHANNELS.FILE_READ, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async fileWrite(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_WRITE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_WRITE>> {
    return this.sendRequest(IPC_CHANNELS.FILE_WRITE, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async fileDelete(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_DELETE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_DELETE>> {
    return this.sendRequest(IPC_CHANNELS.FILE_DELETE, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async fileExists(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_EXISTS>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_EXISTS>> {
    return this.sendRequest(IPC_CHANNELS.FILE_EXISTS, data)
  }

  async fileWatch(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_WATCH>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_WATCH>> {
    return this.sendRequest(IPC_CHANNELS.FILE_WATCH, data)
  }

  async fileUnwatch(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_UNWATCH>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_UNWATCH>> {
    return this.sendRequest(IPC_CHANNELS.FILE_UNWATCH, data)
  }

  async dirCreate(data: RequestDataForChannel<typeof IPC_CHANNELS.DIR_CREATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.DIR_CREATE>> {
    return this.sendRequest(IPC_CHANNELS.DIR_CREATE, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async dirRead(data: RequestDataForChannel<typeof IPC_CHANNELS.DIR_READ>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.DIR_READ>> {
    return this.sendRequest(IPC_CHANNELS.DIR_READ, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  // Project methods
  async projectCreate(data: RequestDataForChannel<typeof IPC_CHANNELS.PROJECT_CREATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROJECT_CREATE>> {
    return this.sendRequest(IPC_CHANNELS.PROJECT_CREATE, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async projectLoad(data: RequestDataForChannel<typeof IPC_CHANNELS.PROJECT_LOAD>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROJECT_LOAD>> {
    return this.sendRequest(IPC_CHANNELS.PROJECT_LOAD, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async projectStructure(data: RequestDataForChannel<typeof IPC_CHANNELS.PROJECT_STRUCTURE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROJECT_STRUCTURE>> {
    return this.sendRequest(IPC_CHANNELS.PROJECT_STRUCTURE, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async projectValidate(data: RequestDataForChannel<typeof IPC_CHANNELS.PROJECT_VALIDATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROJECT_VALIDATE>> {
    return this.sendRequest(IPC_CHANNELS.PROJECT_VALIDATE, data)
  }

  // Process methods
  async processExecute(data: RequestDataForChannel<typeof IPC_CHANNELS.PROCESS_EXECUTE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROCESS_EXECUTE>> {
    const timeout = data.timeout || IPC_TIMEOUT.DEFAULT
    return this.sendRequest(IPC_CHANNELS.PROCESS_EXECUTE, data, timeout + 1000) // Add buffer to IPC timeout
  }

  async processKill(data: RequestDataForChannel<typeof IPC_CHANNELS.PROCESS_KILL>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROCESS_KILL>> {
    return this.sendRequest(IPC_CHANNELS.PROCESS_KILL, data)
  }

  async processList(data: RequestDataForChannel<typeof IPC_CHANNELS.PROCESS_LIST>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROCESS_LIST>> {
    return this.sendRequest(IPC_CHANNELS.PROCESS_LIST, data)
  }

  // Terminal methods
  async terminalCreate(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_CREATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_CREATE>> {
    return this.sendRequest(IPC_CHANNELS.TERMINAL_CREATE, data)
  }

  async terminalInput(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_INPUT>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_INPUT>> {
    return this.sendRequest(IPC_CHANNELS.TERMINAL_INPUT, data)
  }

  async terminalResize(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_RESIZE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_RESIZE>> {
    return this.sendRequest(IPC_CHANNELS.TERMINAL_RESIZE, data)
  }

  async terminalClose(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_CLOSE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_CLOSE>> {
    return this.sendRequest(IPC_CHANNELS.TERMINAL_CLOSE, data)
  }

  async terminalList(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_LIST>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_LIST>> {
    return this.sendRequest(IPC_CHANNELS.TERMINAL_LIST, data)
  }

  // Build methods
  async buildProgram(data: RequestDataForChannel<typeof IPC_CHANNELS.BUILD_PROGRAM>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.BUILD_PROGRAM>> {
    return this.sendRequest(IPC_CHANNELS.BUILD_PROGRAM, data, IPC_TIMEOUT.BUILD_OPERATIONS)
  }

  async buildClean(data: RequestDataForChannel<typeof IPC_CHANNELS.BUILD_CLEAN>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.BUILD_CLEAN>> {
    return this.sendRequest(IPC_CHANNELS.BUILD_CLEAN, data, IPC_TIMEOUT.BUILD_OPERATIONS)
  }

  async buildCancel(data: RequestDataForChannel<typeof IPC_CHANNELS.BUILD_CANCEL>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.BUILD_CANCEL>> {
    return this.sendRequest(IPC_CHANNELS.BUILD_CANCEL, data)
  }

  // Deploy methods
  async deployProgram(data: RequestDataForChannel<typeof IPC_CHANNELS.DEPLOY_PROGRAM>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.DEPLOY_PROGRAM>> {
    return this.sendRequest(IPC_CHANNELS.DEPLOY_PROGRAM, data, IPC_TIMEOUT.DEPLOY_OPERATIONS)
  }

  // Test methods
  async testRun(data: RequestDataForChannel<typeof IPC_CHANNELS.TEST_RUN>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TEST_RUN>> {
    return this.sendRequest(IPC_CHANNELS.TEST_RUN, data, IPC_TIMEOUT.TEST_OPERATIONS)
  }

  async testDebug(data: RequestDataForChannel<typeof IPC_CHANNELS.TEST_DEBUG>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TEST_DEBUG>> {
    return this.sendRequest(IPC_CHANNELS.TEST_DEBUG, data, IPC_TIMEOUT.TEST_OPERATIONS)
  }

  async testCancel(data: RequestDataForChannel<typeof IPC_CHANNELS.TEST_CANCEL>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TEST_CANCEL>> {
    return this.sendRequest(IPC_CHANNELS.TEST_CANCEL, data)
  }

  // Workspace methods
  async workspaceSave(data: RequestDataForChannel<typeof IPC_CHANNELS.WORKSPACE_SAVE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.WORKSPACE_SAVE>> {
    return this.sendRequest(IPC_CHANNELS.WORKSPACE_SAVE, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async workspaceLoad(data: RequestDataForChannel<typeof IPC_CHANNELS.WORKSPACE_LOAD>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.WORKSPACE_LOAD>> {
    return this.sendRequest(IPC_CHANNELS.WORKSPACE_LOAD, data, IPC_TIMEOUT.FILE_OPERATIONS)
  }

  async workspaceRecent(data: RequestDataForChannel<typeof IPC_CHANNELS.WORKSPACE_RECENT>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.WORKSPACE_RECENT>> {
    return this.sendRequest(IPC_CHANNELS.WORKSPACE_RECENT, data)
  }

  async workspaceSetActive(data: RequestDataForChannel<typeof IPC_CHANNELS.WORKSPACE_SET_ACTIVE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.WORKSPACE_SET_ACTIVE>> {
    return this.sendRequest(IPC_CHANNELS.WORKSPACE_SET_ACTIVE, data)
  }

  // Toolchain methods
  async toolchainDetect(data: RequestDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_DETECT>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_DETECT>> {
    return this.sendRequest(IPC_CHANNELS.TOOLCHAIN_DETECT, data, IPC_TIMEOUT.DEFAULT * 2) // Toolchain detection can be slow
  }

  async toolchainValidate(data: RequestDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_VALIDATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_VALIDATE>> {
    return this.sendRequest(IPC_CHANNELS.TOOLCHAIN_VALIDATE, data)
  }

  async toolchainInstall(data: RequestDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_INSTALL>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_INSTALL>> {
    return this.sendRequest(IPC_CHANNELS.TOOLCHAIN_INSTALL, data, IPC_TIMEOUT.DEPLOY_OPERATIONS) // Installation can take a while
  }

  // Event listener methods
  onFileChanged(callback: (data: EventDataForChannel<typeof IPC_CHANNELS.EVENT_FILE_CHANGED>) => void): () => void {
    return this.addEventListener(IPC_CHANNELS.EVENT_FILE_CHANGED, callback)
  }

  onProcessOutput(callback: (data: EventDataForChannel<typeof IPC_CHANNELS.EVENT_PROCESS_OUTPUT>) => void): () => void {
    return this.addEventListener(IPC_CHANNELS.EVENT_PROCESS_OUTPUT, callback)
  }

  onProcessExit(callback: (data: EventDataForChannel<typeof IPC_CHANNELS.EVENT_PROCESS_EXIT>) => void): () => void {
    return this.addEventListener(IPC_CHANNELS.EVENT_PROCESS_EXIT, callback)
  }

  onBuildProgress(callback: (data: EventDataForChannel<typeof IPC_CHANNELS.EVENT_BUILD_PROGRESS>) => void): () => void {
    return this.addEventListener(IPC_CHANNELS.EVENT_BUILD_PROGRESS, callback)
  }

  onTestProgress(callback: (data: EventDataForChannel<typeof IPC_CHANNELS.EVENT_TEST_PROGRESS>) => void): () => void {
    return this.addEventListener(IPC_CHANNELS.EVENT_TEST_PROGRESS, callback)
  }

  onTerminalOutput(callback: (data: EventDataForChannel<typeof IPC_CHANNELS.EVENT_TERMINAL_OUTPUT>) => void): () => void {
    return this.addEventListener(IPC_CHANNELS.EVENT_TERMINAL_OUTPUT, callback)
  }

  // Utility methods
  removeAllListeners(): void {
    for (const [channel, listeners] of this.eventListeners.entries()) {
      listeners.clear()
      this.ipcRenderer.removeAllListeners(channel)
    }
    this.eventListeners.clear()
  }

  // Request with retry capability
  async sendRequestWithRetry<T extends IPCChannelName>(
    channel: T,
    data: RequestDataForChannel<T>,
    maxAttempts: number = 3,
    timeout: number = IPC_TIMEOUT.DEFAULT
  ): Promise<ResponseDataForChannel<T>> {
    const wrapper = new IPCRequestWrapper(
      channel,
      (request) => this.sendRawRequest(request),
      timeout
    )
    
    return wrapper.sendWithRetry(data, maxAttempts)
  }

  // Get request queue status
  getQueueStatus(): { active: number; queued: number } {
    return {
      active: this.requestQueue.getActiveRequestCount(),
      queued: this.requestQueue.getQueueSize()
    }
  }

  // Clear all pending requests
  clearQueue(): void {
    this.requestQueue.clear()
  }

  // Private methods
  private async sendRequest<T extends IPCChannelName>(
    channel: T,
    data: RequestDataForChannel<T>,
    timeout: number = IPC_TIMEOUT.DEFAULT
  ): Promise<ResponseDataForChannel<T>> {
    try {
      const result = await this.requestQueue.enqueue(channel, data, timeout)
      return result as ResponseDataForChannel<T>
    } catch (error) {
      if (error instanceof IPCRequestError) {
        throw error
      }
      throw new IPCRequestError({
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
        suggestedActions: ['Check network connection', 'Retry the operation']
      })
    }
  }

  private async sendRawRequest<T extends IPCChannelName>(
    request: IPCRequest<RequestDataForChannel<T>>
  ): Promise<IPCResponse<ResponseDataForChannel<T>>> {
    return new Promise((resolve, reject) => {
      // Set up response handler
      const responseHandler = (event: any, response: IPCResponse<ResponseDataForChannel<T>>) => {
        if (response.id === request.id) {
          this.ipcRenderer.removeListener(`${request.channel}-response`, responseHandler)
          resolve(response)
        }
      }

      // Set up error handler
      const errorHandler = (event: any, error: any) => {
        if (error.requestId === request.id) {
          this.ipcRenderer.removeListener(`${request.channel}-error`, errorHandler)
          reject(new Error(error.message))
        }
      }

      // Register handlers
      this.ipcRenderer.on(`${request.channel}-response`, responseHandler)
      this.ipcRenderer.on(`${request.channel}-error`, errorHandler)

      // Send request using Electron's invoke method
      this.ipcRenderer.invoke(request.channel, request)
        .then((response: IPCResponse<ResponseDataForChannel<T>>) => {
          this.ipcRenderer.removeListener(`${request.channel}-response`, responseHandler)
          this.ipcRenderer.removeListener(`${request.channel}-error`, errorHandler)
          
          if (!validateIPCResponse(response, request.channel as T)) {
            reject(new Error(`Invalid response format for channel ${request.channel}`))
            return
          }

          resolve(response)
        })
        .catch((error: any) => {
          this.ipcRenderer.removeListener(`${request.channel}-response`, responseHandler)
          this.ipcRenderer.removeListener(`${request.channel}-error`, errorHandler)
          reject(error)
        })
    })
  }

  private addEventListener<T extends IPCEventChannelName>(
    channel: T,
    callback: (data: EventDataForChannel<T>) => void
  ): () => void {
    if (!this.eventListeners.has(channel)) {
      this.eventListeners.set(channel, new Set())
      
      // Set up IPC listener for this channel
      this.ipcRenderer.on(channel, (event, eventData) => {
        const listeners = this.eventListeners.get(channel)
        if (listeners) {
          listeners.forEach(listener => {
            try {
              listener(eventData.data)
            } catch (error) {
              console.error(`Error in event listener for ${channel}:`, error)
            }
          })
        }
      })
    }

    const listeners = this.eventListeners.get(channel)!
    listeners.add(callback)

    // Return unsubscribe function
    return () => {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.eventListeners.delete(channel)
        this.ipcRenderer.removeAllListeners(channel)
      }
    }
  }

  private setupEventListeners(): void {
    // Handle responses from the request queue
    this.ipcRenderer.on('ipc-response', (event, response) => {
      this.requestQueue.handleResponse(response)
    })

    // Handle global errors
    this.ipcRenderer.on('ipc-error', (event, error) => {
      console.error('IPC Error:', error)
    })
  }
}