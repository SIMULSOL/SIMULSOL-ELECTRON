// Main process process management types

export interface ProcessManager {
  executeCommand(command: string, args: string[], cwd: string, options?: ProcessOptions): Promise<ProcessResult>
  startTerminal(cwd: string, options?: TerminalOptions): TerminalSession
  killProcess(pid: number): Promise<void>
  getRunningProcesses(): ProcessInfo[]
}

export interface ProcessOptions {
  env?: Record<string, string>
  timeout?: number
  shell?: boolean
  stdio?: 'pipe' | 'inherit' | 'ignore'
}

export interface ProcessResult {
  exitCode: number
  stdout: string
  stderr: string
  duration: number
  pid: number
}

export interface TerminalSession {
  id: string
  pid: number
  cwd: string
  shell: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  onData(callback: (data: string) => void): void
  onExit(callback: (code: number) => void): void
}

export interface TerminalOptions {
  shell?: string
  env?: Record<string, string>
  cols?: number
  rows?: number
}

export interface ProcessInfo {
  pid: number
  name: string
  command: string
  cwd: string
  startTime: Date
}