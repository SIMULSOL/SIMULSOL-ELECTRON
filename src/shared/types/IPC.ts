// IPC communication types

import { ProjectStructure, ProjectTemplate } from './Project'
import { BuildConfig, BuildResult, DeployConfig, DeployResult } from './Build'
import { TestConfig, TestResult } from './Test'
import { WorkspaceState, WorkspaceInfo } from './Workspace'

// IPC Channel names
export const IPC_CHANNELS = {
  // File System
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  FILE_EXISTS: 'file:exists',
  FILE_WATCH: 'file:watch',
  FILE_UNWATCH: 'file:unwatch',
  DIR_CREATE: 'dir:create',
  DIR_READ: 'dir:read',
  PROJECT_CREATE: 'project:create',
  PROJECT_LOAD: 'project:load',
  PROJECT_STRUCTURE: 'project:structure',
  PROJECT_VALIDATE: 'project:validate',

  // Process Management
  PROCESS_EXECUTE: 'process:execute',
  PROCESS_KILL: 'process:kill',
  PROCESS_LIST: 'process:list',
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_LIST: 'terminal:list',

  // Build and Deploy
  BUILD_PROGRAM: 'build:program',
  BUILD_CLEAN: 'build:clean',
  BUILD_CANCEL: 'build:cancel',
  DEPLOY_PROGRAM: 'deploy:program',

  // Testing
  TEST_RUN: 'test:run',
  TEST_DEBUG: 'test:debug',
  TEST_CANCEL: 'test:cancel',

  // Workspace
  WORKSPACE_SAVE: 'workspace:save',
  WORKSPACE_LOAD: 'workspace:load',
  WORKSPACE_RECENT: 'workspace:recent',
  WORKSPACE_SET_ACTIVE: 'workspace:set-active',

  // Toolchain
  TOOLCHAIN_DETECT: 'toolchain:detect',
  TOOLCHAIN_VALIDATE: 'toolchain:validate',
  TOOLCHAIN_INSTALL: 'toolchain:install',

  // Events (one-way notifications)
  EVENT_FILE_CHANGED: 'event:file-changed',
  EVENT_PROCESS_OUTPUT: 'event:process-output',
  EVENT_PROCESS_EXIT: 'event:process-exit',
  EVENT_BUILD_PROGRESS: 'event:build-progress',
  EVENT_TEST_PROGRESS: 'event:test-progress',
  EVENT_TERMINAL_OUTPUT: 'event:terminal-output'
} as const

// IPC Message types
export interface IPCRequest<T = any> {
  id: string
  channel: string
  data: T
  timestamp: number
}

export interface IPCResponse<T = any> {
  id: string
  success: boolean
  data?: T
  error?: IPCError
  timestamp: number
}

// IPC Error types
export interface IPCError {
  code: string
  message: string
  details?: string
  stack?: string
  recoverable: boolean
  suggestedActions?: string[]
}

export type IPCErrorCode = 
  | 'FILE_NOT_FOUND'
  | 'FILE_ACCESS_DENIED'
  | 'FILE_ALREADY_EXISTS'
  | 'INVALID_PATH'
  | 'PROCESS_FAILED'
  | 'PROCESS_NOT_FOUND'
  | 'TERMINAL_ERROR'
  | 'BUILD_FAILED'
  | 'TEST_FAILED'
  | 'WORKSPACE_ERROR'
  | 'TOOLCHAIN_ERROR'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR'

// Event types for one-way notifications
export interface IPCEvent<T = any> {
  channel: string
  data: T
  timestamp: number
}

// Specific IPC message data types

// File System Requests
export interface FileReadRequest {
  path: string
}

export interface FileWriteRequest {
  path: string
  content: string
  encoding?: string
}

export interface FileDeleteRequest {
  path: string
}

export interface FileExistsRequest {
  path: string
}

export interface FileWatchRequest {
  paths: string[]
  options?: {
    recursive?: boolean
    ignoreInitial?: boolean
  }
}

export interface DirCreateRequest {
  path: string
  recursive?: boolean
}

export interface DirReadRequest {
  path: string
}

export interface ProjectCreateRequest {
  template: ProjectTemplate
  path: string
  name: string
}

export interface ProjectLoadRequest {
  path: string
}

export interface ProjectStructureRequest {
  path: string
}

export interface ProjectValidateRequest {
  path: string
}

// Process Management Requests
export interface ProcessExecuteRequest {
  command: string
  args: string[]
  cwd: string
  env?: Record<string, string>
  timeout?: number
}

export interface ProcessKillRequest {
  pid: number
  signal?: string
}

export interface TerminalCreateRequest {
  cwd: string
  shell?: string
  env?: Record<string, string>
}

export interface TerminalInputRequest {
  terminalId: string
  input: string
}

export interface TerminalResizeRequest {
  terminalId: string
  cols: number
  rows: number
}

export interface TerminalCloseRequest {
  terminalId: string
}

// Build and Deploy Requests
export interface BuildProgramRequest extends BuildConfig {}

export interface BuildCleanRequest {
  projectPath: string
}

export interface BuildCancelRequest {
  buildId: string
}

export interface DeployProgramRequest extends DeployConfig {}

// Testing Requests
export interface TestRunRequest extends TestConfig {}

export interface TestDebugRequest extends TestConfig {
  breakpoints?: Array<{
    file: string
    line: number
  }>
}

export interface TestCancelRequest {
  testId: string
}

// Workspace Requests
export interface WorkspaceSaveRequest {
  workspace: WorkspaceState
}

export interface WorkspaceLoadRequest {
  path: string
}

export interface WorkspaceSetActiveRequest {
  projectPath: string
}

// Toolchain Requests
export interface ToolchainDetectRequest {
  force?: boolean
}

export interface ToolchainValidateRequest {
  toolchainPath?: string
}

export interface ToolchainInstallRequest {
  version?: string
  force?: boolean
}

// IPC Response data types

// File System Responses
export interface FileReadResponse {
  content: string
  encoding: string
}

export interface FileWriteResponse {
  bytesWritten: number
}

export interface FileDeleteResponse {
  deleted: boolean
}

export interface FileExistsResponse {
  exists: boolean
}

export interface FileWatchResponse {
  watcherId: string
}

export interface DirCreateResponse {
  created: boolean
}

export interface DirReadResponse {
  files: Array<{
    name: string
    path: string
    isDirectory: boolean
    size: number
    modified: Date
  }>
}

export interface ProjectCreateResponse {
  project: ProjectStructure
}

export interface ProjectLoadResponse {
  project: ProjectStructure
}

export interface ProjectStructureResponse {
  structure: ProjectStructure
}

export interface ProjectValidateResponse {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Process Management Responses
export interface ProcessExecuteResponse {
  pid: number
  exitCode: number
  stdout: string
  stderr: string
  duration: number
}

export interface ProcessKillResponse {
  killed: boolean
}

export interface ProcessListResponse {
  processes: Array<{
    pid: number
    command: string
    cwd: string
    startTime: Date
  }>
}

export interface TerminalCreateResponse {
  terminalId: string
  pid: number
}

export interface TerminalInputResponse {
  sent: boolean
}

export interface TerminalResizeResponse {
  resized: boolean
}

export interface TerminalCloseResponse {
  closed: boolean
}

export interface TerminalListResponse {
  terminals: Array<{
    id: string
    pid: number
    cwd: string
    shell: string
    isActive: boolean
  }>
}

// Build and Deploy Responses
export interface BuildProgramResponse extends BuildResult {
  buildId: string
}

export interface BuildCleanResponse {
  cleaned: boolean
  removedFiles: string[]
}

export interface BuildCancelResponse {
  cancelled: boolean
}

export interface DeployProgramResponse extends DeployResult {}

// Testing Responses
export interface TestRunResponse extends TestResult {
  testId: string
}

export interface TestDebugResponse extends TestResult {
  testId: string
  debugPort?: number
}

export interface TestCancelResponse {
  cancelled: boolean
}

// Workspace Responses
export interface WorkspaceSaveResponse {
  saved: boolean
  path: string
}

export interface WorkspaceLoadResponse {
  workspace: WorkspaceState
}

export interface WorkspaceRecentResponse {
  workspaces: WorkspaceInfo[]
}

export interface WorkspaceSetActiveResponse {
  activeProject: string
}

// Toolchain Responses
export interface ToolchainDetectResponse {
  detected: boolean
  version?: string
  path?: string
  components: Array<{
    name: string
    version: string
    path: string
  }>
}

export interface ToolchainValidateResponse {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ToolchainInstallResponse {
  installed: boolean
  version: string
  path: string
}

// Event data types
export interface FileChangedEvent {
  path: string
  type: 'created' | 'modified' | 'deleted' | 'renamed'
  oldPath?: string
}

export interface ProcessOutputEvent {
  pid: number
  type: 'stdout' | 'stderr'
  data: string
}

export interface ProcessExitEvent {
  pid: number
  exitCode: number
  signal?: string
}

export interface BuildProgressEvent {
  buildId: string
  stage: string
  progress: number
  message: string
}

export interface TestProgressEvent {
  testId: string
  stage: string
  progress: number
  message: string
  currentTest?: string
}

export interface TerminalOutputEvent {
  terminalId: string
  data: string
}// Type-saf
e IPC wrapper functions and utilities

// Channel type mapping for type safety
export interface IPCChannelMap {
  // File System
  [IPC_CHANNELS.FILE_READ]: { request: FileReadRequest; response: FileReadResponse }
  [IPC_CHANNELS.FILE_WRITE]: { request: FileWriteRequest; response: FileWriteResponse }
  [IPC_CHANNELS.FILE_DELETE]: { request: FileDeleteRequest; response: FileDeleteResponse }
  [IPC_CHANNELS.FILE_EXISTS]: { request: FileExistsRequest; response: FileExistsResponse }
  [IPC_CHANNELS.FILE_WATCH]: { request: FileWatchRequest; response: FileWatchResponse }
  [IPC_CHANNELS.FILE_UNWATCH]: { request: { watcherId: string }; response: { unwatched: boolean } }
  [IPC_CHANNELS.DIR_CREATE]: { request: DirCreateRequest; response: DirCreateResponse }
  [IPC_CHANNELS.DIR_READ]: { request: DirReadRequest; response: DirReadResponse }
  [IPC_CHANNELS.PROJECT_CREATE]: { request: ProjectCreateRequest; response: ProjectCreateResponse }
  [IPC_CHANNELS.PROJECT_LOAD]: { request: ProjectLoadRequest; response: ProjectLoadResponse }
  [IPC_CHANNELS.PROJECT_STRUCTURE]: { request: ProjectStructureRequest; response: ProjectStructureResponse }
  [IPC_CHANNELS.PROJECT_VALIDATE]: { request: ProjectValidateRequest; response: ProjectValidateResponse }

  // Process Management
  [IPC_CHANNELS.PROCESS_EXECUTE]: { request: ProcessExecuteRequest; response: ProcessExecuteResponse }
  [IPC_CHANNELS.PROCESS_KILL]: { request: ProcessKillRequest; response: ProcessKillResponse }
  [IPC_CHANNELS.PROCESS_LIST]: { request: {}; response: ProcessListResponse }
  [IPC_CHANNELS.TERMINAL_CREATE]: { request: TerminalCreateRequest; response: TerminalCreateResponse }
  [IPC_CHANNELS.TERMINAL_INPUT]: { request: TerminalInputRequest; response: TerminalInputResponse }
  [IPC_CHANNELS.TERMINAL_RESIZE]: { request: TerminalResizeRequest; response: TerminalResizeResponse }
  [IPC_CHANNELS.TERMINAL_CLOSE]: { request: TerminalCloseRequest; response: TerminalCloseResponse }
  [IPC_CHANNELS.TERMINAL_LIST]: { request: {}; response: TerminalListResponse }

  // Build and Deploy
  [IPC_CHANNELS.BUILD_PROGRAM]: { request: BuildProgramRequest; response: BuildProgramResponse }
  [IPC_CHANNELS.BUILD_CLEAN]: { request: BuildCleanRequest; response: BuildCleanResponse }
  [IPC_CHANNELS.BUILD_CANCEL]: { request: BuildCancelRequest; response: BuildCancelResponse }
  [IPC_CHANNELS.DEPLOY_PROGRAM]: { request: DeployProgramRequest; response: DeployProgramResponse }

  // Testing
  [IPC_CHANNELS.TEST_RUN]: { request: TestRunRequest; response: TestRunResponse }
  [IPC_CHANNELS.TEST_DEBUG]: { request: TestDebugRequest; response: TestDebugResponse }
  [IPC_CHANNELS.TEST_CANCEL]: { request: TestCancelRequest; response: TestCancelResponse }

  // Workspace
  [IPC_CHANNELS.WORKSPACE_SAVE]: { request: WorkspaceSaveRequest; response: WorkspaceSaveResponse }
  [IPC_CHANNELS.WORKSPACE_LOAD]: { request: WorkspaceLoadRequest; response: WorkspaceLoadResponse }
  [IPC_CHANNELS.WORKSPACE_RECENT]: { request: {}; response: WorkspaceRecentResponse }
  [IPC_CHANNELS.WORKSPACE_SET_ACTIVE]: { request: WorkspaceSetActiveRequest; response: WorkspaceSetActiveResponse }

  // Toolchain
  [IPC_CHANNELS.TOOLCHAIN_DETECT]: { request: ToolchainDetectRequest; response: ToolchainDetectResponse }
  [IPC_CHANNELS.TOOLCHAIN_VALIDATE]: { request: ToolchainValidateRequest; response: ToolchainValidateResponse }
  [IPC_CHANNELS.TOOLCHAIN_INSTALL]: { request: ToolchainInstallRequest; response: ToolchainInstallResponse }
}

// Event channel type mapping
export interface IPCEventMap {
  [IPC_CHANNELS.EVENT_FILE_CHANGED]: FileChangedEvent
  [IPC_CHANNELS.EVENT_PROCESS_OUTPUT]: ProcessOutputEvent
  [IPC_CHANNELS.EVENT_PROCESS_EXIT]: ProcessExitEvent
  [IPC_CHANNELS.EVENT_BUILD_PROGRESS]: BuildProgressEvent
  [IPC_CHANNELS.EVENT_TEST_PROGRESS]: TestProgressEvent
  [IPC_CHANNELS.EVENT_TERMINAL_OUTPUT]: TerminalOutputEvent
}

// Utility types for type-safe IPC operations
export type IPCChannelName = keyof IPCChannelMap
export type IPCEventChannelName = keyof IPCEventMap

export type RequestDataForChannel<T extends IPCChannelName> = IPCChannelMap[T]['request']
export type ResponseDataForChannel<T extends IPCChannelName> = IPCChannelMap[T]['response']
export type EventDataForChannel<T extends IPCEventChannelName> = IPCEventMap[T]

// IPC validation utilities
export function createIPCRequest<T extends IPCChannelName>(
  channel: T,
  data: RequestDataForChannel<T>
): IPCRequest<RequestDataForChannel<T>> {
  return {
    id: generateRequestId(),
    channel,
    data,
    timestamp: Date.now()
  }
}

export function createIPCResponse<T extends IPCChannelName>(
  requestId: string,
  success: boolean,
  data?: ResponseDataForChannel<T>,
  error?: IPCError
): IPCResponse<ResponseDataForChannel<T>> {
  return {
    id: requestId,
    success,
    data,
    error,
    timestamp: Date.now()
  }
}

export function createIPCEvent<T extends IPCEventChannelName>(
  channel: T,
  data: EventDataForChannel<T>
): IPCEvent<EventDataForChannel<T>> {
  return {
    channel,
    data,
    timestamp: Date.now()
  }
}

export function createIPCError(
  code: IPCErrorCode,
  message: string,
  details?: string,
  recoverable: boolean = true,
  suggestedActions?: string[]
): IPCError {
  return {
    code,
    message,
    details,
    recoverable,
    suggestedActions,
    stack: new Error().stack
  }
}

// Request ID generation
let requestIdCounter = 0
export function generateRequestId(): string {
  return `ipc_${Date.now()}_${++requestIdCounter}`
}

// Validation functions
export function validateIPCRequest<T extends IPCChannelName>(
  request: IPCRequest<any>,
  channel: T
): request is IPCRequest<RequestDataForChannel<T>> {
  return (
    typeof request === 'object' &&
    request !== null &&
    typeof request.id === 'string' &&
    request.channel === channel &&
    typeof request.timestamp === 'number' &&
    request.data !== undefined
  )
}

export function validateIPCResponse<T extends IPCChannelName>(
  response: IPCResponse<any>,
  channel: T
): response is IPCResponse<ResponseDataForChannel<T>> {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof response.id === 'string' &&
    typeof response.success === 'boolean' &&
    typeof response.timestamp === 'number' &&
    (response.success ? response.data !== undefined : response.error !== undefined)
  )
}

export function validateIPCEvent<T extends IPCEventChannelName>(
  event: IPCEvent<any>,
  channel: T
): event is IPCEvent<EventDataForChannel<T>> {
  return (
    typeof event === 'object' &&
    event !== null &&
    event.channel === channel &&
    typeof event.timestamp === 'number' &&
    event.data !== undefined
  )
}

// Error handling utilities
export function isRecoverableError(error: IPCError): boolean {
  return error.recoverable === true
}

export function getErrorSuggestions(error: IPCError): string[] {
  return error.suggestedActions || []
}

export function formatIPCError(error: IPCError): string {
  let message = `[${error.code}] ${error.message}`
  if (error.details) {
    message += `\nDetails: ${error.details}`
  }
  if (error.suggestedActions && error.suggestedActions.length > 0) {
    message += `\nSuggested actions:\n${error.suggestedActions.map(action => `- ${action}`).join('\n')}`
  }
  return message
}