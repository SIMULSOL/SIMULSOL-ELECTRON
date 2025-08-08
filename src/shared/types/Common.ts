// Common types shared between main and renderer processes

export interface Position {
  line: number
  column: number
}

export interface Range {
  start: Position
  end: Position
}

export interface Diagnostic {
  range: Range
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  source?: string
  code?: string | number
}

export interface FileInfo {
  path: string
  name: string
  isDirectory: boolean
  size?: number
  lastModified?: Date
  children?: FileInfo[]
}

export interface ProjectInfo {
  name: string
  path: string
  type: 'anchor' | 'native' | 'token' | 'other'
  description?: string
  version?: string
}

export interface BuildResult {
  success: boolean
  output: string
  errors: Diagnostic[]
  warnings: Diagnostic[]
  duration: number
}

export interface TestResult {
  name: string
  passed: boolean
  duration: number
  output?: string
  error?: string
}

export interface TerminalSession {
  id: string
  title: string
  cwd: string
  isActive: boolean
  pid?: number
}

export interface FileMetadata {
  size: number
  modified: Date
  created?: Date
  permissions?: string
  isHidden?: boolean
}

export interface Dependency {
  name: string
  version: string
  type: 'dev' | 'build' | 'runtime'
  source?: 'crates.io' | 'git' | 'path'
  features?: string[]
}