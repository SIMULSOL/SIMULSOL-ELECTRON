import { ElectronAPI } from '@electron-toolkit/preload'

// API type definitions
interface FileSystemAPI {
  readFile: (path: string) => Promise<{ content: string; encoding: string }>
  writeFile: (path: string, content: string, encoding?: string) => Promise<{ bytesWritten: number }>
  deleteFile: (path: string) => Promise<{ deleted: boolean }>
  fileExists: (path: string) => Promise<{ exists: boolean }>
  createDirectory: (path: string, recursive?: boolean) => Promise<{ created: boolean }>
  readDirectory: (path: string) => Promise<{ files: Array<{ name: string; path: string; isDirectory: boolean; size: number; modified: Date }> }>
  watchFiles: (paths: string[], options?: { recursive?: boolean; ignoreInitial?: boolean }) => Promise<{ watcherId: string }>
  unwatchFiles: (watcherId: string) => Promise<{ unwatched: boolean }>
}

interface ProjectAPI {
  create: (template: any, path: string, name: string) => Promise<{ project: any }>
  load: (path: string) => Promise<{ project: any }>
  getStructure: (path: string) => Promise<{ structure: any }>
  validate: (path: string) => Promise<{ valid: boolean; errors: string[]; warnings: string[] }>
}

interface ProcessAPI {
  execute: (command: string, args: string[], cwd: string, options?: any) => Promise<{ pid: number; exitCode: number; stdout: string; stderr: string; duration: number }>
  kill: (pid: number, signal?: string) => Promise<{ killed: boolean }>
  list: () => Promise<{ processes: Array<{ pid: number; command: string; cwd: string; startTime: Date }> }>
}

interface TerminalAPI {
  create: (cwd: string, shell?: string, env?: Record<string, string>) => Promise<{ terminalId: string; pid: number }>
  sendInput: (terminalId: string, input: string) => Promise<{ sent: boolean }>
  resize: (terminalId: string, cols: number, rows: number) => Promise<{ resized: boolean }>
  close: (terminalId: string) => Promise<{ closed: boolean }>
  list: () => Promise<{ terminals: Array<{ id: string; pid: number; cwd: string; shell: string; isActive: boolean }> }>
}

interface BuildAPI {
  program: (config: any) => Promise<any>
  clean: (projectPath: string) => Promise<{ cleaned: boolean; removedFiles: string[] }>
  cancel: (buildId: string) => Promise<{ cancelled: boolean }>
}

interface DeployAPI {
  program: (config: any) => Promise<any>
}

interface TestAPI {
  run: (config: any) => Promise<any>
  debug: (config: any) => Promise<any>
  cancel: (testId: string) => Promise<{ cancelled: boolean }>
}

interface WorkspaceAPI {
  save: (workspace: any) => Promise<{ saved: boolean; path: string }>
  load: (path: string) => Promise<{ workspace: any }>
  getRecent: () => Promise<{ workspaces: any[] }>
  setActive: (projectPath: string) => Promise<{ activeProject: string }>
}

interface ToolchainAPI {
  detect: (force?: boolean) => Promise<{ detected: boolean; version?: string; path?: string; components: Array<{ name: string; version: string; path: string }> }>
  validate: (toolchainPath?: string) => Promise<{ valid: boolean; errors: string[]; warnings: string[] }>
  install: (version?: string, force?: boolean) => Promise<{ installed: boolean; version: string; path: string }>
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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: SolanaIDEAPI
  }
}
