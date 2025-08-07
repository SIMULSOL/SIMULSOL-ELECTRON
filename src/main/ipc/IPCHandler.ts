/**
 * Main process IPC handler implementation
 * 
 * This class handles all IPC communication between the main process and renderer process.
 * It provides handlers for:
 * - File system operations (read, write, delete, watch, etc.)
 * - Process management (execute commands, manage terminals)
 * - Workspace management (save, load, recent projects)
 * - Build and test operations
 * - Toolchain detection and validation
 * 
 * All handlers follow a consistent pattern:
 * 1. Validate the incoming request
 * 2. Execute the operation using the appropriate service
 * 3. Return a standardized response with success/error information
 * 4. Include suggested actions for error recovery
 */

import { ipcMain, IpcMainEvent } from 'electron'
import {
  IPCRequest,
  IPCResponse,
  IPCChannelName,
  IPC_CHANNELS,
  RequestDataForChannel,
  ResponseDataForChannel,
  createIPCResponse,
  createIPCError,
  validateIPCRequest,
  IPCErrorCode
} from '../../shared/types/IPC'
import { FileSystemManager } from '../services/FileSystemManager'
import { ProcessManager } from '../services/ProcessManager'
import { WorkspaceManager } from '../services/WorkspaceManager'

export class IPCHandler {
  private fileSystemManager: FileSystemManager
  private processManager: ProcessManager
  private workspaceManager: WorkspaceManager
  private activeWatchers: Map<string, any> = new Map()

  constructor(
    fileSystemManager: FileSystemManager,
    processManager: ProcessManager,
    workspaceManager: WorkspaceManager
  ) {
    this.fileSystemManager = fileSystemManager
    this.processManager = processManager
    this.workspaceManager = workspaceManager
    
    this.setupHandlers()
  }

  private setupHandlers(): void {
    // File System handlers
    this.registerHandler(IPC_CHANNELS.FILE_READ, this.handleFileRead.bind(this))
    this.registerHandler(IPC_CHANNELS.FILE_WRITE, this.handleFileWrite.bind(this))
    this.registerHandler(IPC_CHANNELS.FILE_DELETE, this.handleFileDelete.bind(this))
    this.registerHandler(IPC_CHANNELS.FILE_EXISTS, this.handleFileExists.bind(this))
    this.registerHandler(IPC_CHANNELS.FILE_WATCH, this.handleFileWatch.bind(this))
    this.registerHandler(IPC_CHANNELS.FILE_UNWATCH, this.handleFileUnwatch.bind(this))
    this.registerHandler(IPC_CHANNELS.DIR_CREATE, this.handleDirCreate.bind(this))
    this.registerHandler(IPC_CHANNELS.DIR_READ, this.handleDirRead.bind(this))
    this.registerHandler(IPC_CHANNELS.PROJECT_CREATE, this.handleProjectCreate.bind(this))
    this.registerHandler(IPC_CHANNELS.PROJECT_LOAD, this.handleProjectLoad.bind(this))
    this.registerHandler(IPC_CHANNELS.PROJECT_STRUCTURE, this.handleProjectStructure.bind(this))
    this.registerHandler(IPC_CHANNELS.PROJECT_VALIDATE, this.handleProjectValidate.bind(this))

    // Process Management handlers
    this.registerHandler(IPC_CHANNELS.PROCESS_EXECUTE, this.handleProcessExecute.bind(this))
    this.registerHandler(IPC_CHANNELS.PROCESS_KILL, this.handleProcessKill.bind(this))
    this.registerHandler(IPC_CHANNELS.PROCESS_LIST, this.handleProcessList.bind(this))
    this.registerHandler(IPC_CHANNELS.TERMINAL_CREATE, this.handleTerminalCreate.bind(this))
    this.registerHandler(IPC_CHANNELS.TERMINAL_INPUT, this.handleTerminalInput.bind(this))
    this.registerHandler(IPC_CHANNELS.TERMINAL_RESIZE, this.handleTerminalResize.bind(this))
    this.registerHandler(IPC_CHANNELS.TERMINAL_CLOSE, this.handleTerminalClose.bind(this))
    this.registerHandler(IPC_CHANNELS.TERMINAL_LIST, this.handleTerminalList.bind(this))

    // Build and Deploy handlers
    this.registerHandler(IPC_CHANNELS.BUILD_PROGRAM, this.handleBuildProgram.bind(this))
    this.registerHandler(IPC_CHANNELS.BUILD_CLEAN, this.handleBuildClean.bind(this))
    this.registerHandler(IPC_CHANNELS.BUILD_CANCEL, this.handleBuildCancel.bind(this))
    this.registerHandler(IPC_CHANNELS.DEPLOY_PROGRAM, this.handleDeployProgram.bind(this))

    // Testing handlers
    this.registerHandler(IPC_CHANNELS.TEST_RUN, this.handleTestRun.bind(this))
    this.registerHandler(IPC_CHANNELS.TEST_DEBUG, this.handleTestDebug.bind(this))
    this.registerHandler(IPC_CHANNELS.TEST_CANCEL, this.handleTestCancel.bind(this))

    // Workspace handlers
    this.registerHandler(IPC_CHANNELS.WORKSPACE_SAVE, this.handleWorkspaceSave.bind(this))
    this.registerHandler(IPC_CHANNELS.WORKSPACE_LOAD, this.handleWorkspaceLoad.bind(this))
    this.registerHandler(IPC_CHANNELS.WORKSPACE_RECENT, this.handleWorkspaceRecent.bind(this))
    this.registerHandler(IPC_CHANNELS.WORKSPACE_SET_ACTIVE, this.handleWorkspaceSetActive.bind(this))

    // Toolchain handlers
    this.registerHandler(IPC_CHANNELS.TOOLCHAIN_DETECT, this.handleToolchainDetect.bind(this))
    this.registerHandler(IPC_CHANNELS.TOOLCHAIN_VALIDATE, this.handleToolchainValidate.bind(this))
    this.registerHandler(IPC_CHANNELS.TOOLCHAIN_INSTALL, this.handleToolchainInstall.bind(this))
  }

  private registerHandler<T extends IPCChannelName>(
    channel: T,
    handler: (data: RequestDataForChannel<T>) => Promise<ResponseDataForChannel<T>>
  ): void {
    ipcMain.handle(channel, async (event: IpcMainEvent, request: IPCRequest<RequestDataForChannel<T>>) => {
      try {
        // Validate request format
        if (!validateIPCRequest(request, channel)) {
          return createIPCResponse(
            request.id,
            false,
            undefined,
            createIPCError('VALIDATION_ERROR', 'Invalid request format', `Channel: ${channel}`)
          )
        }

        // Execute handler
        const result = await handler(request.data)
        
        return createIPCResponse(request.id, true, result)
      } catch (error) {
        console.error(`IPC handler error for ${channel}:`, error)
        
        let ipcError
        if (error instanceof Error) {
          ipcError = createIPCError(
            this.getErrorCode(error),
            error.message,
            error.stack,
            true,
            this.getSuggestedActions(error)
          )
        } else {
          ipcError = createIPCError(
            'UNKNOWN_ERROR',
            'An unknown error occurred',
            String(error)
          )
        }

        return createIPCResponse(request.id, false, undefined, ipcError)
      }
    })
  }

  // File System handlers
  private async handleFileRead(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_READ>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_READ>> {
    const content = await this.fileSystemManager.readFile(data.path)
    return { content, encoding: 'utf8' }
  }

  private async handleFileWrite(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_WRITE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_WRITE>> {
    await this.fileSystemManager.writeFile(data.path, data.content)
    return { bytesWritten: Buffer.byteLength(data.content, data.encoding || 'utf8') }
  }

  private async handleFileDelete(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_DELETE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_DELETE>> {
    await this.fileSystemManager.deleteFile(data.path)
    return { deleted: true }
  }

  private async handleFileExists(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_EXISTS>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_EXISTS>> {
    const exists = await this.fileSystemManager.exists(data.path)
    return { exists }
  }

  private async handleFileWatch(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_WATCH>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_WATCH>> {
    try {
      // Use the first path as the root directory for watching
      const rootPath = data.paths[0] || process.cwd()
      const watcher = this.fileSystemManager.watchFiles(data.paths, rootPath)
      const watcherId = `watcher-${Date.now()}`
      
      // Store watcher reference for cleanup
      this.activeWatchers.set(watcherId, watcher)
      
      return { watcherId }
    } catch (error) {
      throw new Error(`Failed to start file watcher: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async handleFileUnwatch(data: RequestDataForChannel<typeof IPC_CHANNELS.FILE_UNWATCH>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.FILE_UNWATCH>> {
    const watcher = this.activeWatchers.get(data.watcherId)
    if (watcher) {
      watcher.close()
      this.activeWatchers.delete(data.watcherId)
      return { unwatched: true }
    }
    return { unwatched: false }
  }

  private async handleDirCreate(data: RequestDataForChannel<typeof IPC_CHANNELS.DIR_CREATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.DIR_CREATE>> {
    await this.fileSystemManager.ensureDirectory(data.path)
    return { created: true }
  }

  private async handleDirRead(data: RequestDataForChannel<typeof IPC_CHANNELS.DIR_READ>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.DIR_READ>> {
    const nodes = await this.fileSystemManager.listDirectory(data.path)
    const files = nodes.map(node => ({
      name: node.name,
      path: node.path,
      isDirectory: node.type === 'directory',
      size: node.metadata.size,
      modified: node.metadata.modified
    }))
    return { files }
  }

  private async handleProjectCreate(data: RequestDataForChannel<typeof IPC_CHANNELS.PROJECT_CREATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROJECT_CREATE>> {
    const project = await this.fileSystemManager.createProject(data.template, data.path)
    return { project }
  }

  private async handleProjectLoad(data: RequestDataForChannel<typeof IPC_CHANNELS.PROJECT_LOAD>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROJECT_LOAD>> {
    const project = await this.fileSystemManager.getProjectStructure(data.path)
    return { project }
  }

  private async handleProjectStructure(data: RequestDataForChannel<typeof IPC_CHANNELS.PROJECT_STRUCTURE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROJECT_STRUCTURE>> {
    const structure = await this.fileSystemManager.getProjectStructure(data.path)
    return { structure }
  }

  private async handleProjectValidate(data: RequestDataForChannel<typeof IPC_CHANNELS.PROJECT_VALIDATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROJECT_VALIDATE>> {
    // Basic project validation - check for required files
    const exists = await this.fileSystemManager.exists(data.path)
    if (!exists) {
      return {
        valid: false,
        errors: ['Project directory does not exist'],
        warnings: []
      }
    }

    // Check for Cargo.toml or Anchor.toml
    const hasCargoToml = await this.fileSystemManager.exists(`${data.path}/Cargo.toml`)
    const hasAnchorToml = await this.fileSystemManager.exists(`${data.path}/Anchor.toml`)

    if (!hasCargoToml && !hasAnchorToml) {
      return {
        valid: false,
        errors: ['No Cargo.toml or Anchor.toml found'],
        warnings: []
      }
    }

    return {
      valid: true,
      errors: [],
      warnings: []
    }
  }

  // Process Management handlers
  private async handleProcessExecute(data: RequestDataForChannel<typeof IPC_CHANNELS.PROCESS_EXECUTE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROCESS_EXECUTE>> {
    const result = await this.processManager.executeCommand(
      data.command,
      data.args,
      data.cwd,
      { env: data.env, timeout: data.timeout }
    )
    
    return {
      pid: 0, // Would be set by actual process
      exitCode: result.exitCode || 0,
      stdout: result.stdout,
      stderr: result.stderr,
      duration: result.duration
    }
  }

  private async handleProcessKill(data: RequestDataForChannel<typeof IPC_CHANNELS.PROCESS_KILL>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROCESS_KILL>> {
    await this.processManager.killProcess(data.pid)
    return { killed: true }
  }

  private async handleProcessList(data: RequestDataForChannel<typeof IPC_CHANNELS.PROCESS_LIST>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.PROCESS_LIST>> {
    const processes = this.processManager.getRunningProcesses()
    return {
      processes: processes.map(p => ({
        pid: p.pid,
        command: p.command,
        cwd: p.cwd,
        startTime: p.startTime
      }))
    }
  }

  private async handleTerminalCreate(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_CREATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_CREATE>> {
    const session = this.processManager.startTerminal({
      cwd: data.cwd,
      shell: data.shell,
      env: data.env
    })
    
    return {
      terminalId: session.id,
      pid: session.pid
    }
  }

  private async handleTerminalInput(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_INPUT>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_INPUT>> {
    this.processManager.executeInTerminal(data.terminalId, data.input)
    return { sent: true }
  }

  private async handleTerminalResize(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_RESIZE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_RESIZE>> {
    const session = this.processManager.getTerminalSession(data.terminalId)
    if (session) {
      session.resize(data.cols, data.rows)
      return { resized: true }
    }
    return { resized: false }
  }

  private async handleTerminalClose(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_CLOSE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_CLOSE>> {
    const session = this.processManager.getTerminalSession(data.terminalId)
    if (session) {
      session.kill()
      return { closed: true }
    }
    return { closed: false }
  }

  private async handleTerminalList(data: RequestDataForChannel<typeof IPC_CHANNELS.TERMINAL_LIST>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TERMINAL_LIST>> {
    const sessions = this.processManager.getTerminalSessions()
    return {
      terminals: sessions.map(s => ({
        id: s.id,
        pid: s.pid,
        cwd: s.cwd,
        shell: 'bash', // Would be determined from session
        isActive: s.isAlive()
      }))
    }
  }

  // Build and Deploy handlers (placeholder implementations)
  private async handleBuildProgram(data: RequestDataForChannel<typeof IPC_CHANNELS.BUILD_PROGRAM>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.BUILD_PROGRAM>> {
    // This would integrate with Solana/Anchor build tools
    const buildId = `build-${Date.now()}`
    
    try {
      const result = await this.processManager.executeCommand(
        'cargo',
        ['build-bpf'],
        data.projectPath
      )
      
      return {
        buildId,
        success: result.success,
        artifacts: [],
        errors: result.success ? [] : [{ 
          file: 'unknown', 
          line: 0, 
          column: 0, 
          message: result.stderr, 
          severity: 'error' as const 
        }],
        warnings: [],
        duration: result.duration
      }
    } catch (error) {
      return {
        buildId,
        success: false,
        artifacts: [],
        errors: [{ 
          file: 'unknown', 
          line: 0, 
          column: 0, 
          message: error instanceof Error ? error.message : String(error), 
          severity: 'error' as const 
        }],
        warnings: [],
        duration: 0
      }
    }
  }

  private async handleBuildClean(data: RequestDataForChannel<typeof IPC_CHANNELS.BUILD_CLEAN>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.BUILD_CLEAN>> {
    try {
      await this.processManager.executeCommand('cargo', ['clean'], data.projectPath)
      return { cleaned: true, removedFiles: [] }
    } catch {
      return { cleaned: false, removedFiles: [] }
    }
  }

  private async handleBuildCancel(data: RequestDataForChannel<typeof IPC_CHANNELS.BUILD_CANCEL>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.BUILD_CANCEL>> {
    // Implementation would cancel the specific build
    return { cancelled: true }
  }

  private async handleDeployProgram(data: RequestDataForChannel<typeof IPC_CHANNELS.DEPLOY_PROGRAM>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.DEPLOY_PROGRAM>> {
    // Placeholder implementation
    return {
      success: false,
      programId: '',
      transactionId: '',
      network: data.network,
      error: 'Deploy not implemented yet'
    }
  }

  // Testing handlers (placeholder implementations)
  private async handleTestRun(data: RequestDataForChannel<typeof IPC_CHANNELS.TEST_RUN>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TEST_RUN>> {
    const testId = `test-${Date.now()}`
    
    try {
      const result = await this.processManager.executeCommand(
        'cargo',
        ['test'],
        data.projectPath
      )
      
      return {
        testId,
        success: result.success,
        tests: [],
        duration: result.duration,
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: result.duration
        }
      }
    } catch (error) {
      return {
        testId,
        success: false,
        tests: [],
        duration: 0,
        summary: {
          total: 0,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0
        }
      }
    }
  }

  private async handleTestDebug(data: RequestDataForChannel<typeof IPC_CHANNELS.TEST_DEBUG>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TEST_DEBUG>> {
    const testId = `debug-test-${Date.now()}`
    
    return {
      testId,
      success: false,
      tests: [],
      duration: 0,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      debugPort: 9229
    }
  }

  private async handleTestCancel(data: RequestDataForChannel<typeof IPC_CHANNELS.TEST_CANCEL>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TEST_CANCEL>> {
    return { cancelled: true }
  }

  // Workspace handlers
  private async handleWorkspaceSave(data: RequestDataForChannel<typeof IPC_CHANNELS.WORKSPACE_SAVE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.WORKSPACE_SAVE>> {
    await this.workspaceManager.saveWorkspace(data.workspace)
    return { 
      saved: true, 
      path: data.workspace.activeProject 
    }
  }

  private async handleWorkspaceLoad(data: RequestDataForChannel<typeof IPC_CHANNELS.WORKSPACE_LOAD>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.WORKSPACE_LOAD>> {
    const workspace = await this.workspaceManager.loadWorkspace(data.path)
    return { workspace }
  }

  private async handleWorkspaceRecent(data: RequestDataForChannel<typeof IPC_CHANNELS.WORKSPACE_RECENT>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.WORKSPACE_RECENT>> {
    const workspaces = await this.workspaceManager.getRecentWorkspaces()
    return { workspaces }
  }

  private async handleWorkspaceSetActive(data: RequestDataForChannel<typeof IPC_CHANNELS.WORKSPACE_SET_ACTIVE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.WORKSPACE_SET_ACTIVE>> {
    await this.workspaceManager.setActiveProject(data.projectPath)
    return { activeProject: data.projectPath }
  }

  // Toolchain handlers (placeholder implementations)
  private async handleToolchainDetect(data: RequestDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_DETECT>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_DETECT>> {
    try {
      // Check for Solana CLI
      const solanaResult = await this.processManager.executeCommand('solana', ['--version'])
      const rustResult = await this.processManager.executeCommand('rustc', ['--version'])
      
      return {
        detected: solanaResult.success && rustResult.success,
        version: solanaResult.success ? solanaResult.stdout.trim() : undefined,
        path: '/usr/local/bin/solana', // Would be detected
        components: [
          {
            name: 'solana-cli',
            version: solanaResult.success ? solanaResult.stdout.trim() : 'not found',
            path: '/usr/local/bin/solana'
          },
          {
            name: 'rust',
            version: rustResult.success ? rustResult.stdout.trim() : 'not found',
            path: '/usr/local/bin/rustc'
          }
        ]
      }
    } catch {
      return {
        detected: false,
        components: []
      }
    }
  }

  private async handleToolchainValidate(data: RequestDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_VALIDATE>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_VALIDATE>> {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check if Solana CLI is available
    if (!(await this.processManager.isCommandAvailable('solana'))) {
      errors.push('Solana CLI not found')
    }
    
    // Check if Rust is available
    if (!(await this.processManager.isCommandAvailable('rustc'))) {
      errors.push('Rust compiler not found')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private async handleToolchainInstall(data: RequestDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_INSTALL>): Promise<ResponseDataForChannel<typeof IPC_CHANNELS.TOOLCHAIN_INSTALL>> {
    // Placeholder - would implement actual toolchain installation
    return {
      installed: false,
      version: data.version || 'latest',
      path: '/usr/local/bin/solana'
    }
  }

  // Helper methods
  private getErrorCode(error: Error): IPCErrorCode {
    if (error.name === 'FileSystemError') {
      return 'FILE_NOT_FOUND'
    }
    if (error.name === 'ProcessError') {
      return 'PROCESS_FAILED'
    }
    if (error.name === 'WorkspaceError') {
      return 'WORKSPACE_ERROR'
    }
    return 'UNKNOWN_ERROR'
  }

  private getSuggestedActions(error: Error): string[] {
    // Extract suggested actions from custom error types
    if ('suggestedActions' in error && Array.isArray(error.suggestedActions)) {
      return error.suggestedActions as string[]
    }
    return ['Check the error details and try again']
  }

  /**
   * Cleanup method to remove all IPC handlers and active watchers
   */
  cleanup(): void {
    // Clean up all active file watchers
    for (const watcher of this.activeWatchers.values()) {
      try {
        watcher.close()
      } catch (error) {
        console.warn('Error closing file watcher:', error)
      }
    }
    this.activeWatchers.clear()

    // Remove all registered handlers
    Object.values(IPC_CHANNELS).forEach(channel => {
      ipcMain.removeAllListeners(channel)
    })
  }
}