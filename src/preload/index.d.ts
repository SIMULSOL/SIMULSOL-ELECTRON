import { ElectronAPI } from '@electron-toolkit/preload'

// Enhanced API type definitions with error handling and retry capabilities
interface IPCError {
  code: string
  message: string
  details?: string
  recoverable: boolean
  suggestedActions?: string[]
}

interface RetryOptions {
  maxAttempts?: number
  onRetry?: (attempt: number, error: IPCError) => void
  onRecovery?: (error: IPCError) => Promise<boolean>
}

interface FileSystemAPI {
  readFile: (path: string) => Promise<{ content: string; encoding: string }>
  writeFile: (path: string, content: string, encoding?: string) => Promise<{ bytesWritten: number }>
  deleteFile: (path: string) => Promise<{ deleted: boolean }>
  fileExists: (path: string) => Promise<{ exists: boolean }>
  createDirectory: (path: string, recursive?: boolean) => Promise<{ created: boolean }>
  readDirectory: (path: string) => Promise<{ files: Array<{ name: string; path: string; isDirectory: boolean; size: number; modified: Date }> }>
  watchFiles: (paths: string[], options?: { recursive?: boolean; ignoreInitial?: boolean }) => Promise<{ watcherId: string }>
  unwatchFiles: (watcherId: string) => Promise<{ unwatched: boolean }>
  
  // Enhanced methods with retry and recovery
  readFileWithRetry: (path: string, maxAttempts?: number) => Promise<{ content: string; encoding: string }>
  writeFileWithRecovery: (
    path: string, 
    content: string, 
    options?: {
      encoding?: string
      maxAttempts?: number
      onRetry?: (attempt: number, error: IPCError) => void
      onRecovery?: (error: IPCError) => Promise<boolean>
    }
  ) => Promise<{ bytesWritten: number }>
}

interface ProjectAPI {
  create: (template: any, path: string, name: string) => Promise<{ project: any }>
  load: (path: string) => Promise<{ project: any }>
  getStructure: (path: string) => Promise<{ structure: any }>
  validate: (path: string) => Promise<{ valid: boolean; errors: string[]; warnings: string[] }>
  
  // Enhanced methods
  loadWithRetry: (path: string, maxAttempts?: number) => Promise<{ project: any }>
  createWithRecovery: (
    template: any, 
    path: string, 
    name: string,
    options?: RetryOptions
  ) => Promise<{ project: any }>
}

interface ProcessAPI {
  execute: (command: string, args: string[], cwd: string, options?: any) => Promise<{ pid: number; exitCode: number; stdout: string; stderr: string; duration: number }>
  kill: (pid: number, signal?: string) => Promise<{ killed: boolean }>
  list: () => Promise<{ processes: Array<{ pid: number; command: string; cwd: string; startTime: Date }> }>
  
  // Enhanced methods
  executeWithRetry: (
    command: string, 
    args: string[], 
    cwd: string, 
    options?: { maxAttempts?: number; timeout?: number; env?: Record<string, string> }
  ) => Promise<{ pid: number; exitCode: number; stdout: string; stderr: string; duration: number }>
}

interface TerminalAPI {
  create: (cwd: string, shell?: string, env?: Record<string, string>) => Promise<{ terminalId: string; pid: number }>
  sendInput: (terminalId: string, input: string) => Promise<{ sent: boolean }>
  resize: (terminalId: string, cols: number, rows: number) => Promise<{ resized: boolean }>
  close: (terminalId: string) => Promise<{ closed: boolean }>
  list: () => Promise<{ terminals: Array<{ id: string; pid: number; cwd: string; shell: string; isActive: boolean }> }>
  
  // Enhanced methods
  createWithRetry: (cwd: string, shell?: string, env?: Record<string, string>, maxAttempts?: number) => Promise<{ terminalId: string; pid: number }>
}

interface BuildAPI {
  program: (config: any) => Promise<any>
  clean: (projectPath: string) => Promise<{ cleaned: boolean; removedFiles: string[] }>
  cancel: (buildId: string) => Promise<{ cancelled: boolean }>
  
  // Enhanced methods
  programWithRetry: (config: any, maxAttempts?: number) => Promise<any>
  programWithRecovery: (config: any, options?: RetryOptions) => Promise<any>
}

interface DeployAPI {
  program: (config: any) => Promise<any>
  
  // Enhanced methods
  programWithRetry: (config: any, maxAttempts?: number) => Promise<any>
  programWithRecovery: (config: any, options?: RetryOptions) => Promise<any>
}

interface TestAPI {
  run: (config: any) => Promise<any>
  debug: (config: any) => Promise<any>
  cancel: (testId: string) => Promise<{ cancelled: boolean }>
  
  // Enhanced methods
  runWithRetry: (config: any, maxAttempts?: number) => Promise<any>
  runWithRecovery: (config: any, options?: RetryOptions) => Promise<any>
}

interface WorkspaceAPI {
  save: (workspace: any) => Promise<{ saved: boolean; path: string }>
  load: (path: string) => Promise<{ workspace: any }>
  getRecent: () => Promise<{ workspaces: any[] }>
  setActive: (projectPath: string) => Promise<{ activeProject: string }>
  
  // Enhanced methods
  saveWithRetry: (workspace: any, maxAttempts?: number) => Promise<{ saved: boolean; path: string }>
  loadWithRetry: (path: string, maxAttempts?: number) => Promise<{ workspace: any }>
}

interface ToolchainAPI {
  detect: (force?: boolean) => Promise<{ detected: boolean; version?: string; path?: string; components: Array<{ name: string; version: string; path: string }> }>
  validate: (toolchainPath?: string) => Promise<{ valid: boolean; errors: string[]; warnings: string[] }>
  install: (version?: string, force?: boolean) => Promise<{ installed: boolean; version: string; path: string }>
  
  // Enhanced methods
  detectWithRetry: (force?: boolean, maxAttempts?: number) => Promise<{ detected: boolean; version?: string; path?: string; components: Array<{ name: string; version: string; path: string }> }>
  installWithRecovery: (
    version?: string,
    force?: boolean,
    options?: RetryOptions
  ) => Promise<{ installed: boolean; version: string; path: string }>
}

interface EventsAPI {
  onFileChanged: (callback: (data: any) => void) => () => void
  onProcessOutput: (callback: (data: any) => void) => () => void
  onProcessExit: (callback: (data: any) => void) => () => void
  onBuildProgress: (callback: (data: any) => void) => () => void
  onTestProgress: (callback: (data: any) => void) => () => void
  onTerminalOutput: (callback: (data: any) => void) => () => void
  removeAllListeners: () => void
}

interface WindowControlAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
}

interface NavigationAPI {
  back: () => Promise<boolean>
  forward: () => Promise<boolean>
  reload: () => Promise<void>
  canGoBack: () => Promise<boolean>
  canGoForward: () => Promise<boolean>
}

interface IPCUtilitiesAPI {
  getQueueStatus: () => { active: number; queued: number }
  clearQueue: () => void
  sendRequestWithRetry: <T extends any>(channel: string, data: T, maxAttempts?: number) => Promise<any>
  sendRequestWithRecovery: <T extends any>(
    channel: string, 
    data: T, 
    options?: {
      timeout?: number
      maxAttempts?: number
      onRetry?: (attempt: number, error: IPCError) => void
      onRecovery?: (error: IPCError) => Promise<boolean>
    }
  ) => Promise<any>
}

interface SolanaIDEAPI {
  fileSystem: FileSystemAPI
  project: ProjectAPI
  process: ProcessAPI
  terminal: TerminalAPI
  build: BuildAPI
  deploy: DeployAPI
  test: TestAPI
  workspace: WorkspaceAPI
  toolchain: ToolchainAPI
  events: EventsAPI
  window: WindowControlAPI
  navigation: NavigationAPI
  ipc: IPCUtilitiesAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: SolanaIDEAPI
  }
}
