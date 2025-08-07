import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPCClient } from './IPCClient'

// Create IPC client instance
const ipcClient = new IPCClient(ipcRenderer)

// Custom APIs for renderer
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
    unwatchFiles: (watcherId: string) => ipcClient.fileUnwatch({ watcherId })
  },

  // Project API
  project: {
    create: (template: any, path: string, name: string) => 
      ipcClient.projectCreate({ template, path, name }),
    load: (path: string) => ipcClient.projectLoad({ path }),
    getStructure: (path: string) => ipcClient.projectStructure({ path }),
    validate: (path: string) => ipcClient.projectValidate({ path })
  },

  // Process API
  process: {
    execute: (command: string, args: string[], cwd: string, options?: any) =>
      ipcClient.processExecute({ command, args, cwd, ...options }),
    kill: (pid: number, signal?: string) => ipcClient.processKill({ pid, signal }),
    list: () => ipcClient.processList({})
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
    list: () => ipcClient.terminalList({})
  },

  // Build API
  build: {
    program: (config: any) => ipcClient.buildProgram(config),
    clean: (projectPath: string) => ipcClient.buildClean({ projectPath }),
    cancel: (buildId: string) => ipcClient.buildCancel({ buildId })
  },

  // Deploy API
  deploy: {
    program: (config: any) => ipcClient.deployProgram(config)
  },

  // Test API
  test: {
    run: (config: any) => ipcClient.testRun(config),
    debug: (config: any) => ipcClient.testDebug(config),
    cancel: (testId: string) => ipcClient.testCancel({ testId })
  },

  // Workspace API
  workspace: {
    save: (workspace: any) => ipcClient.workspaceSave({ workspace }),
    load: (path: string) => ipcClient.workspaceLoad({ path }),
    getRecent: () => ipcClient.workspaceRecent({}),
    setActive: (projectPath: string) => ipcClient.workspaceSetActive({ projectPath })
  },

  // Toolchain API
  toolchain: {
    detect: (force?: boolean) => ipcClient.toolchainDetect({ force }),
    validate: (toolchainPath?: string) => ipcClient.toolchainValidate({ toolchainPath }),
    install: (version?: string, force?: boolean) => ipcClient.toolchainInstall({ version, force })
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
