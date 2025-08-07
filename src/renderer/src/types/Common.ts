// Renderer process common types

export interface EventEmitter<T = any> {
  on<K extends keyof T>(event: K, listener: T[K]): void
  off<K extends keyof T>(event: K, listener: T[K]): void
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void
}

export interface Disposable {
  dispose(): void
}

export interface Command {
  id: string
  title: string
  category?: string
  icon?: string
  keybinding?: string
  when?: string
  handler: (...args: any[]) => any
}

export interface KeyBinding {
  key: string
  command: string
  when?: string
  args?: any[]
}

export interface Theme {
  name: string
  type: 'light' | 'dark'
  colors: ThemeColors
  tokenColors: TokenColor[]
}

export interface ThemeColors {
  'editor.background': string
  'editor.foreground': string
  'editor.lineHighlightBackground': string
  'editor.selectionBackground': string
  'editorCursor.foreground': string
  'editorLineNumber.foreground': string
  'editorLineNumber.activeForeground': string
  'sideBar.background': string
  'sideBar.foreground': string
  'activityBar.background': string
  'activityBar.foreground': string
  'statusBar.background': string
  'statusBar.foreground': string
  'terminal.background': string
  'terminal.foreground': string
  [key: string]: string
}

export interface TokenColor {
  name?: string
  scope: string | string[]
  settings: {
    foreground?: string
    background?: string
    fontStyle?: string
  }
}

export interface ProgressOptions {
  title: string
  cancellable?: boolean
  location?: 'notification' | 'window' | 'source-control'
}

export interface Progress<T> {
  report(value: T): void
}

export interface CancellationToken {
  isCancellationRequested: boolean
  onCancellationRequested: (listener: () => void) => Disposable
}

export interface QuickPickItem {
  label: string
  description?: string
  detail?: string
  picked?: boolean
  alwaysShow?: boolean
}

export interface QuickPickOptions {
  title?: string
  placeholder?: string
  canPickMany?: boolean
  ignoreFocusOut?: boolean
  matchOnDescription?: boolean
  matchOnDetail?: boolean
}

export interface InputBoxOptions {
  title?: string
  value?: string
  valueSelection?: [number, number]
  prompt?: string
  placeholder?: string
  password?: boolean
  ignoreFocusOut?: boolean
  validateInput?: (value: string) => string | undefined | null | Thenable<string | undefined | null>
}