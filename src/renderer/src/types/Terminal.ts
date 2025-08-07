// Renderer process terminal types

export interface TerminalComponent {
  createTerminal(config: TerminalConfig): TerminalInstance
  executeCommand(command: string): Promise<void>
  sendInput(input: string): void
  clear(): void
  resize(cols: number, rows: number): void
  onOutput(callback: (data: string) => void): void
  onExit(callback: (code: number) => void): void
}

export interface TerminalConfig {
  id: string
  name: string
  cwd: string
  shell?: string
  env?: Record<string, string>
  theme?: TerminalTheme
  fontSize?: number
  fontFamily?: string
  cols?: number
  rows?: number
}

export interface TerminalInstance {
  id: string
  name: string
  cwd: string
  isActive: boolean
  write(data: string): void
  writeln(data: string): void
  clear(): void
  focus(): void
  blur(): void
  resize(cols: number, rows: number): void
  dispose(): void
  onData(callback: (data: string) => void): void
  onResize(callback: (size: { cols: number; rows: number }) => void): void
  onTitleChange(callback: (title: string) => void): void
}

export interface TerminalTheme {
  foreground?: string
  background?: string
  cursor?: string
  cursorAccent?: string
  selection?: string
  black?: string
  red?: string
  green?: string
  yellow?: string
  blue?: string
  magenta?: string
  cyan?: string
  white?: string
  brightBlack?: string
  brightRed?: string
  brightGreen?: string
  brightYellow?: string
  brightBlue?: string
  brightMagenta?: string
  brightCyan?: string
  brightWhite?: string
}

export interface CommandCompletion {
  command: string
  description: string
  options: CommandOption[]
  examples: string[]
}

export interface CommandOption {
  name: string
  description: string
  type: 'string' | 'number' | 'boolean' | 'choice'
  required: boolean
  choices?: string[]
  default?: any
}

export interface TerminalHistory {
  commands: HistoryEntry[]
  maxEntries: number
  add(command: string): void
  search(query: string): HistoryEntry[]
  clear(): void
}

export interface HistoryEntry {
  command: string
  timestamp: Date
  exitCode?: number
  duration?: number
}