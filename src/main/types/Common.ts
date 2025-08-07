// Main process common types

export interface ErrorHandler {
  handleFileSystemError(error: FileSystemError): UserFriendlyError
  handleCompilationError(error: CompilationError): DiagnosticError
  handleRuntimeError(error: RuntimeError): ActionableError
  handleNetworkError(error: NetworkError): RetryableError
}

export interface FileSystemError extends Error {
  code: string
  path: string
  operation: string
}

export interface CompilationError extends Error {
  file: string
  line: number
  column: number
  code?: string
}

export interface RuntimeError extends Error {
  process: string
  exitCode: number
  signal?: string
}

export interface NetworkError extends Error {
  url: string
  statusCode?: number
  timeout?: boolean
}

export interface UserFriendlyError {
  message: string
  details: string
  suggestedActions: Action[]
  severity: 'error' | 'warning' | 'info'
}

export interface DiagnosticError extends UserFriendlyError {
  file: string
  line: number
  column: number
}

export interface ActionableError extends UserFriendlyError {
  canRetry: boolean
  autoFix?: () => Promise<void>
}

export interface RetryableError extends UserFriendlyError {
  retryCount: number
  maxRetries: number
  retryDelay: number
}

export interface Action {
  title: string
  command: string
  arguments?: any[]
}