// Common types used across the application

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

export interface UserFriendlyError {
  message: string
  details: string
  suggestedActions: Action[]
  severity: 'error' | 'warning' | 'info'
}

export interface Action {
  title: string
  command: string
  arguments?: any[]
}

export interface FileMetadata {
  size: number
  created: Date
  modified: Date
  isReadonly: boolean
  encoding?: string
}

export interface Dependency {
  name: string
  version: string
  type: 'dev' | 'runtime'
  source: 'crates.io' | 'git' | 'local'
}