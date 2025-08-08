import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPCClient } from './IPCClient'

// Create IPC client instance
const ipcClient = new IPCClient(ipcRenderer)

// Custom APIs for renderer with enhanced error handling and retry capabilities
const api = {
  // File System API
  fileSystem: {
    readFile: (path: string) => ipcClient.fileRead({ path }),
    writeFile: (path: string, content: string, encoding?: string) => 
      ipcClient.fileWrite({ path, content, encoding }),
    deleteFile: (path: string) => ipcClient.fileDelete({ path }),
    fileExists: (path: string) => ipcClient.fileExists({ path }),
    createDirectory: (path: string, recursive?: boolean) => 
      ipcClient.dirCreate({ path, recursive }),
    readDirectory: (path: string) => ipcClient.dirRead({ path }),
    watchFiles: (paths: string[], options?: { recursive?: boolean; ignoreInitial?: boolean }) =>
      ipcClient.fileWatch({ paths, options }),
    unwatchFiles: (watcherId: string) => ipcClient.fileUnwatch({ watcherId }),
    
    // Enhanced methods with retry and recovery
    readFileWithRetry: (path: string, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('file:read', { path }, maxAttempts),
    writeFileWithRecovery: (
      path: string, 
      content: string, 
      options?: {
        encoding?: string
        maxAttempts?: number
        onRetry?: (attempt: number, error: any) => void
        onRecovery?: (error: any) => Promise<boolean>
      }
    ) => ipcClient.sendRequestWithRecovery('file:write', 
      { path, content, encoding: options?.encoding }, 
      {
        maxAttempts: options?.maxAttempts,
        onRetry: options?.onRetry,
        onRecovery: options?.onRecovery
      }
    )
  },

  // Project API
  project: {
    create: (template: any, path: string, name: string) => 
      ipcClient.projectCreate({ template, path, name }),
    load: (path: string) => ipcClient.projectLoad({ path }),
    getStructure: (path: string) => ipcClient.projectStructure({ path }),
    validate: (path: string) => ipcClient.projectValidate({ path }),
    
    // Enhanced methods
    loadWithRetry: (path: string, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('project:load', { path }, maxAttempts),
    createWithRecovery: (
      template: any, 
      path: string, 
      name: string,
      options?: {
        maxAttempts?: number
        onRetry?: (attempt: number, error: any) => void
        onRecovery?: (error: any) => Promise<boolean>
      }
    ) => ipcClient.sendRequestWithRecovery('project:create', 
      { template, path, name }, 
      options
    )
  },

  // Process API
  process: {
    execute: (command: string, args: string[], cwd: string, options?: any) =>
      ipcClient.processExecute({ command, args, cwd, ...options }),
    kill: (pid: number, signal?: string) => ipcClient.processKill({ pid, signal }),
    list: () => ipcClient.processList({}),
    
    // Enhanced methods
    executeWithRetry: (
      command: string, 
      args: string[], 
      cwd: string, 
      options?: { maxAttempts?: number; timeout?: number; env?: Record<string, string> }
    ) => ipcClient.sendRequestWithRetry('process:execute', 
      { command, args, cwd, timeout: options?.timeout, env: options?.env }, 
      options?.maxAttempts
    )
  },

  // Terminal API
  terminal: {
    create: (cwd: string, shell?: string, env?: Record<string, string>) =>
      ipcClient.terminalCreate({ cwd, shell, env }),
    sendInput: (terminalId: string, input: string) =>
      ipcClient.terminalInput({ terminalId, input }),
    resize: (terminalId: string, cols: number, rows: number) =>
      ipcClient.terminalResize({ terminalId, cols, rows }),
    close: (terminalId: string) => ipcClient.terminalClose({ terminalId }),
    list: () => ipcClient.terminalList({}),
    
    // Enhanced methods
    createWithRetry: (cwd: string, shell?: string, env?: Record<string, string>, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('terminal:create', { cwd, shell, env }, maxAttempts)
  },

  // Build API
  build: {
    program: (config: any) => ipcClient.buildProgram(config),
    clean: (projectPath: string) => ipcClient.buildClean({ projectPath }),
    cancel: (buildId: string) => ipcClient.buildCancel({ buildId }),
    
    // Enhanced methods
    programWithRetry: (config: any, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('build:program', config, maxAttempts),
    programWithRecovery: (
      config: any,
      options?: {
        maxAttempts?: number
        onRetry?: (attempt: number, error: any) => void
        onRecovery?: (error: any) => Promise<boolean>
      }
    ) => ipcClient.sendRequestWithRecovery('build:program', config, options)
  },

  // Deploy API
  deploy: {
    program: (config: any) => ipcClient.deployProgram(config),
    
    // Enhanced methods
    programWithRetry: (config: any, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('deploy:program', config, maxAttempts),
    programWithRecovery: (
      config: any,
      options?: {
        maxAttempts?: number
        onRetry?: (attempt: number, error: any) => void
        onRecovery?: (error: any) => Promise<boolean>
      }
    ) => ipcClient.sendRequestWithRecovery('deploy:program', config, options)
  },

  // Test API
  test: {
    run: (config: any) => ipcClient.testRun(config),
    debug: (config: any) => ipcClient.testDebug(config),
    cancel: (testId: string) => ipcClient.testCancel({ testId }),
    
    // Enhanced methods
    runWithRetry: (config: any, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('test:run', config, maxAttempts),
    runWithRecovery: (
      config: any,
      options?: {
        maxAttempts?: number
        onRetry?: (attempt: number, error: any) => void
        onRecovery?: (error: any) => Promise<boolean>
      }
    ) => ipcClient.sendRequestWithRecovery('test:run', config, options)
  },

  // Workspace API
  workspace: {
    save: (workspace: any) => ipcClient.workspaceSave({ workspace }),
    load: (path: string) => ipcClient.workspaceLoad({ path }),
    getRecent: () => ipcClient.workspaceRecent({}),
    setActive: (projectPath: string) => ipcClient.workspaceSetActive({ projectPath }),
    
    // Enhanced methods
    saveWithRetry: (workspace: any, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('workspace:save', { workspace }, maxAttempts),
    loadWithRetry: (path: string, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('workspace:load', { path }, maxAttempts)
  },

  // Toolchain API
  toolchain: {
    detect: (force?: boolean) => ipcClient.toolchainDetect({ force }),
    validate: (toolchainPath?: string) => ipcClient.toolchainValidate({ toolchainPath }),
    install: (version?: string, force?: boolean) => ipcClient.toolchainInstall({ version, force }),
    
    // Enhanced methods
    detectWithRetry: (force?: boolean, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry('toolchain:detect', { force }, maxAttempts),
    installWithRecovery: (
      version?: string,
      force?: boolean,
      options?: {
        maxAttempts?: number
        onRetry?: (attempt: number, error: any) => void
        onRecovery?: (error: any) => Promise<boolean>
      }
    ) => ipcClient.sendRequestWithRecovery('toolchain:install', 
      { version, force }, 
      options
    )
  },

  // Event listeners
  events: {
    onFileChanged: (callback: (data: any) => void) => ipcClient.onFileChanged(callback),
    onProcessOutput: (callback: (data: any) => void) => ipcClient.onProcessOutput(callback),
    onProcessExit: (callback: (data: any) => void) => ipcClient.onProcessExit(callback),
    onBuildProgress: (callback: (data: any) => void) => ipcClient.onBuildProgress(callback),
    onTestProgress: (callback: (data: any) => void) => ipcClient.onTestProgress(callback),
    onTerminalOutput: (callback: (data: any) => void) => ipcClient.onTerminalOutput(callback),
    removeAllListeners: () => ipcClient.removeAllListeners()
  },

  // Window control API
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },

  // Navigation API
  navigation: {
    back: () => ipcRenderer.invoke('navigation:back'),
    forward: () => ipcRenderer.invoke('navigation:forward'),
    reload: () => ipcRenderer.invoke('navigation:reload'),
    canGoBack: () => ipcRenderer.invoke('navigation:canGoBack'),
    canGoForward: () => ipcRenderer.invoke('navigation:canGoForward')
  },

  // IPC Client utilities
  ipc: {
    getQueueStatus: () => ipcClient.getQueueStatus(),
    clearQueue: () => ipcClient.clearQueue(),
    sendRequestWithRetry: <T extends any>(channel: string, data: T, maxAttempts?: number) =>
      ipcClient.sendRequestWithRetry(channel as any, data, maxAttempts),
    sendRequestWithRecovery: <T extends any>(
      channel: string, 
      data: T, 
      options?: {
        timeout?: number
        maxAttempts?: number
        onRetry?: (attempt: number, error: any) => void
        onRecovery?: (error: any) => Promise<boolean>
      }
    ) => ipcClient.sendRequestWithRecovery(channel as any, data, options)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
