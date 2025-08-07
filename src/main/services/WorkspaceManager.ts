import { promises as fs } from 'fs'
import { join, dirname, basename } from 'path'
import { EventEmitter } from 'events'

export interface WorkspaceState {
  activeProject: string
  openFiles: OpenFile[]
  layout: LayoutState
  terminalSessions: TerminalSessionState[]
  preferences: UserPreferences
  recentProjects: string[]
  lastSaved: Date
  version: string
}

export interface OpenFile {
  path: string
  content: string
  isDirty: boolean
  cursorPosition: Position
  scrollPosition: number
  isActive: boolean
}

export interface Position {
  line: number
  column: number
}

export interface LayoutState {
  panels: PanelState[]
  sidebarWidth: number
  bottomPanelHeight: number
  isBottomPanelVisible: boolean
  isSidebarVisible: boolean
}

export interface PanelState {
  id: string
  type: 'editor' | 'terminal' | 'explorer' | 'output' | 'problems'
  size: number
  isVisible: boolean
  position: 'left' | 'right' | 'bottom' | 'center'
  data?: any
}

export interface TerminalSessionState {
  id: string
  cwd: string
  title: string
  isActive: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  fontSize: number
  fontFamily: string
  tabSize: number
  insertSpaces: boolean
  wordWrap: boolean
  autoSave: boolean
  autoSaveDelay: number
  formatOnSave: boolean
  showWhitespace: boolean
  showLineNumbers: boolean
}

export interface WorkspaceInfo {
  name: string
  path: string
  lastOpened: Date
  projectType: 'anchor' | 'native' | 'token'
}

export interface AutoSaveConfig {
  enabled: boolean
  interval: number
  maxBackups: number
}

export class WorkspaceError extends Error {
  constructor(
    message: string,
    public code: string,
    public path?: string,
    public suggestedActions: string[] = []
  ) {
    super(message)
    this.name = 'WorkspaceError'
  }
}

export class WorkspaceManager extends EventEmitter {
  private currentWorkspace: WorkspaceState | null = null
  private workspacePath: string | null = null
  private autoSaveTimer: NodeJS.Timeout | null = null
  private autoSaveConfig: AutoSaveConfig = {
    enabled: true,
    interval: 30000, // 30 seconds
    maxBackups: 5
  }
  private isDirty = false

  private readonly WORKSPACE_FILE = '.simusol-workspace.json'
  private readonly WORKSPACE_VERSION = '1.0.0'
  private readonly RECENT_PROJECTS_FILE = 'recent-projects.json'

  /**
   * Saves the current workspace state
   */
  async saveWorkspace(workspace?: WorkspaceState): Promise<void> {
    try {
      const workspaceToSave = workspace || this.currentWorkspace
      if (!workspaceToSave || !this.workspacePath) {
        throw new WorkspaceError(
          'No workspace to save',
          'NO_WORKSPACE',
          undefined,
          ['Open a project first', 'Create a new workspace']
        )
      }

      // Update last saved timestamp
      workspaceToSave.lastSaved = new Date()
      workspaceToSave.version = this.WORKSPACE_VERSION

      const workspaceFilePath = join(this.workspacePath, this.WORKSPACE_FILE)
      const workspaceData = JSON.stringify(workspaceToSave, null, 2)

      // Ensure directory exists
      await fs.mkdir(dirname(workspaceFilePath), { recursive: true })
      
      // Create backup before saving
      await this.createBackup(workspaceFilePath)
      
      // Save the workspace
      await fs.writeFile(workspaceFilePath, workspaceData, 'utf8')

      this.isDirty = false
      this.emit('workspace-saved', workspaceToSave)

    } catch (error) {
      throw this.handleWorkspaceError(error, this.workspacePath, [
        'Check that you have write permissions',
        'Ensure the workspace directory is accessible',
        'Try saving to a different location'
      ])
    }
  }

  /**
   * Loads workspace state from a project path
   */
  async loadWorkspace(projectPath: string): Promise<WorkspaceState> {
    try {
      this.workspacePath = projectPath
      const workspaceFilePath = join(projectPath, this.WORKSPACE_FILE)

      let workspace: WorkspaceState

      try {
        const workspaceData = await fs.readFile(workspaceFilePath, 'utf8')
        workspace = JSON.parse(workspaceData)
        
        // Validate and migrate workspace if needed
        workspace = await this.validateAndMigrateWorkspace(workspace)
        
      } catch (error) {
        // Create default workspace if file doesn't exist
        workspace = this.createDefaultWorkspace(projectPath)
      }

      this.currentWorkspace = workspace
      this.startAutoSave()
      
      // Update recent projects
      await this.updateRecentProjects(projectPath)
      
      this.emit('workspace-loaded', workspace)
      return workspace

    } catch (error) {
      throw this.handleWorkspaceError(error, projectPath, [
        'Check that the project directory exists',
        'Ensure you have read permissions',
        'Verify the workspace file is not corrupted'
      ])
    }
  }

  /**
   * Gets the list of recent projects
   */
  async getRecentWorkspaces(): Promise<WorkspaceInfo[]> {
    try {
      const recentProjectsPath = this.getRecentProjectsPath()
      
      try {
        const data = await fs.readFile(recentProjectsPath, 'utf8')
        const recentProjects = JSON.parse(data)
        
        // Validate that projects still exist
        const validProjects: WorkspaceInfo[] = []
        for (const project of recentProjects) {
          try {
            await fs.access(project.path)
            validProjects.push(project)
          } catch {
            // Project no longer exists, skip it
          }
        }
        
        return validProjects.sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime())
        
      } catch {
        return []
      }
    } catch (error) {
      throw this.handleWorkspaceError(error, undefined, [
        'Check application data directory permissions',
        'Try clearing recent projects cache'
      ])
    }
  }

  /**
   * Sets the active project in the workspace
   */
  async setActiveProject(projectPath: string): Promise<void> {
    if (!this.currentWorkspace) {
      throw new WorkspaceError(
        'No workspace loaded',
        'NO_WORKSPACE',
        projectPath,
        ['Load a workspace first']
      )
    }

    try {
      // Verify project exists
      await fs.access(projectPath)
      
      this.currentWorkspace.activeProject = projectPath
      this.markDirty()
      
      this.emit('active-project-changed', projectPath)
      
    } catch (error) {
      throw this.handleWorkspaceError(error, projectPath, [
        'Check that the project directory exists',
        'Ensure you have access permissions'
      ])
    }
  }

  /**
   * Updates an open file in the workspace
   */
  updateOpenFile(filePath: string, updates: Partial<OpenFile>): void {
    if (!this.currentWorkspace) {
      throw new WorkspaceError(
        'No workspace loaded',
        'NO_WORKSPACE',
        filePath,
        ['Load a workspace first']
      )
    }

    const existingFileIndex = this.currentWorkspace.openFiles.findIndex(f => f.path === filePath)
    
    if (existingFileIndex >= 0) {
      // Update existing file
      this.currentWorkspace.openFiles[existingFileIndex] = {
        ...this.currentWorkspace.openFiles[existingFileIndex],
        ...updates
      }
    } else {
      // Add new file
      const newFile: OpenFile = {
        path: filePath,
        content: '',
        isDirty: false,
        cursorPosition: { line: 0, column: 0 },
        scrollPosition: 0,
        isActive: false,
        ...updates
      }
      this.currentWorkspace.openFiles.push(newFile)
    }

    this.markDirty()
    this.emit('file-updated', filePath, updates)
  }

  /**
   * Removes an open file from the workspace
   */
  closeFile(filePath: string): void {
    if (!this.currentWorkspace) return

    const fileIndex = this.currentWorkspace.openFiles.findIndex(f => f.path === filePath)
    if (fileIndex >= 0) {
      this.currentWorkspace.openFiles.splice(fileIndex, 1)
      this.markDirty()
      this.emit('file-closed', filePath)
    }
  }

  /**
   * Updates the layout state
   */
  updateLayout(layout: Partial<LayoutState>): void {
    if (!this.currentWorkspace) {
      throw new WorkspaceError(
        'No workspace loaded',
        'NO_WORKSPACE',
        undefined,
        ['Load a workspace first']
      )
    }

    this.currentWorkspace.layout = {
      ...this.currentWorkspace.layout,
      ...layout
    }

    this.markDirty()
    this.emit('layout-updated', this.currentWorkspace.layout)
  }

  /**
   * Updates user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    if (!this.currentWorkspace) {
      throw new WorkspaceError(
        'No workspace loaded',
        'NO_WORKSPACE',
        undefined,
        ['Load a workspace first']
      )
    }

    this.currentWorkspace.preferences = {
      ...this.currentWorkspace.preferences,
      ...preferences
    }

    this.markDirty()
    this.emit('preferences-updated', this.currentWorkspace.preferences)
  }

  /**
   * Adds or updates a terminal session
   */
  updateTerminalSession(sessionId: string, updates: Partial<TerminalSessionState>): void {
    if (!this.currentWorkspace) return

    const existingIndex = this.currentWorkspace.terminalSessions.findIndex(s => s.id === sessionId)
    
    if (existingIndex >= 0) {
      this.currentWorkspace.terminalSessions[existingIndex] = {
        ...this.currentWorkspace.terminalSessions[existingIndex],
        ...updates
      }
    } else {
      const newSession: TerminalSessionState = {
        id: sessionId,
        cwd: '',
        title: 'Terminal',
        isActive: false,
        ...updates
      }
      this.currentWorkspace.terminalSessions.push(newSession)
    }

    this.markDirty()
    this.emit('terminal-updated', sessionId, updates)
  }

  /**
   * Removes a terminal session
   */
  removeTerminalSession(sessionId: string): void {
    if (!this.currentWorkspace) return

    const sessionIndex = this.currentWorkspace.terminalSessions.findIndex(s => s.id === sessionId)
    if (sessionIndex >= 0) {
      this.currentWorkspace.terminalSessions.splice(sessionIndex, 1)
      this.markDirty()
      this.emit('terminal-removed', sessionId)
    }
  }

  /**
   * Gets the current workspace state
   */
  getCurrentWorkspace(): WorkspaceState | null {
    return this.currentWorkspace
  }

  /**
   * Checks if the workspace has unsaved changes
   */
  isDirtyWorkspace(): boolean {
    return this.isDirty
  }

  /**
   * Creates a recovery file for crash scenarios
   */
  async createRecoveryFile(): Promise<void> {
    if (!this.currentWorkspace || !this.workspacePath) return

    try {
      const recoveryPath = join(this.workspacePath, '.simusol-recovery.json')
      const recoveryData = {
        ...this.currentWorkspace,
        recoveryTimestamp: new Date(),
        openFiles: this.currentWorkspace.openFiles.filter(f => f.isDirty)
      }

      await fs.writeFile(recoveryPath, JSON.stringify(recoveryData, null, 2), 'utf8')
    } catch (error) {
      // Recovery file creation should not fail the main operation
      console.warn('Failed to create recovery file:', error)
    }
  }

  /**
   * Recovers workspace from recovery file
   */
  async recoverWorkspace(projectPath: string): Promise<WorkspaceState | null> {
    try {
      const recoveryPath = join(projectPath, '.simusol-recovery.json')
      const recoveryData = await fs.readFile(recoveryPath, 'utf8')
      const recoveredWorkspace = JSON.parse(recoveryData)

      // Clean up recovery file
      await fs.unlink(recoveryPath)

      return recoveredWorkspace
    } catch {
      return null
    }
  }

  /**
   * Configures auto-save settings
   */
  configureAutoSave(config: Partial<AutoSaveConfig>): void {
    this.autoSaveConfig = { ...this.autoSaveConfig, ...config }
    
    if (this.autoSaveConfig.enabled) {
      this.startAutoSave()
    } else {
      this.stopAutoSave()
    }
  }

  /**
   * Forces an immediate save
   */
  async forceSave(): Promise<void> {
    if (this.currentWorkspace && this.isDirty) {
      await this.saveWorkspace()
    }
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.stopAutoSave()
    this.removeAllListeners()
  }

  // Private helper methods

  private createDefaultWorkspace(projectPath: string): WorkspaceState {
    return {
      activeProject: projectPath,
      openFiles: [],
      layout: {
        panels: [
          {
            id: 'explorer',
            type: 'explorer',
            size: 250,
            isVisible: true,
            position: 'left'
          },
          {
            id: 'editor',
            type: 'editor',
            size: 0, // Flexible
            isVisible: true,
            position: 'center'
          },
          {
            id: 'terminal',
            type: 'terminal',
            size: 200,
            isVisible: true,
            position: 'bottom'
          }
        ],
        sidebarWidth: 250,
        bottomPanelHeight: 200,
        isBottomPanelVisible: true,
        isSidebarVisible: true
      },
      terminalSessions: [],
      preferences: {
        theme: 'dark',
        fontSize: 14,
        fontFamily: 'Monaco, Consolas, monospace',
        tabSize: 2,
        insertSpaces: true,
        wordWrap: true,
        autoSave: true,
        autoSaveDelay: 1000,
        formatOnSave: true,
        showWhitespace: false,
        showLineNumbers: true
      },
      recentProjects: [projectPath],
      lastSaved: new Date(),
      version: this.WORKSPACE_VERSION
    }
  }

  private async validateAndMigrateWorkspace(workspace: any): Promise<WorkspaceState> {
    // Basic validation
    if (!workspace.version) {
      workspace.version = '1.0.0'
    }

    // Ensure required properties exist
    if (!workspace.openFiles) workspace.openFiles = []
    if (!workspace.terminalSessions) workspace.terminalSessions = []
    if (!workspace.recentProjects) workspace.recentProjects = []
    if (!workspace.layout) workspace.layout = this.createDefaultWorkspace('').layout
    if (!workspace.preferences) workspace.preferences = this.createDefaultWorkspace('').preferences

    // Convert date strings back to Date objects
    if (workspace.lastSaved && typeof workspace.lastSaved === 'string') {
      workspace.lastSaved = new Date(workspace.lastSaved)
    }

    return workspace as WorkspaceState
  }

  private async updateRecentProjects(projectPath: string): Promise<void> {
    try {
      const recentProjectsPath = this.getRecentProjectsPath()
      let recentProjects: WorkspaceInfo[] = []

      try {
        const data = await fs.readFile(recentProjectsPath, 'utf8')
        recentProjects = JSON.parse(data)
      } catch {
        // File doesn't exist, start with empty array
      }

      // Remove existing entry for this project
      recentProjects = recentProjects.filter(p => p.path !== projectPath)

      // Add current project to the beginning
      const projectInfo: WorkspaceInfo = {
        name: basename(projectPath),
        path: projectPath,
        lastOpened: new Date(),
        projectType: 'anchor' // Default, could be detected
      }
      recentProjects.unshift(projectInfo)

      // Keep only the most recent 10 projects
      recentProjects = recentProjects.slice(0, 10)

      // Save updated list
      await fs.mkdir(dirname(recentProjectsPath), { recursive: true })
      await fs.writeFile(recentProjectsPath, JSON.stringify(recentProjects, null, 2), 'utf8')

    } catch (error) {
      // Don't fail if we can't update recent projects
      console.warn('Failed to update recent projects:', error)
    }
  }

  private getRecentProjectsPath(): string {
    // Use OS-appropriate app data directory
    const appDataDir = process.env.APPDATA || 
                      (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : 
                       process.env.HOME + '/.local/share')
    return join(appDataDir, 'simusol', this.RECENT_PROJECTS_FILE)
  }

  private async createBackup(workspaceFilePath: string): Promise<void> {
    try {
      const backupDir = join(dirname(workspaceFilePath), '.workspace-backups')
      await fs.mkdir(backupDir, { recursive: true })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = join(backupDir, `workspace-${timestamp}.json`)

      // Copy current workspace file to backup
      try {
        await fs.copyFile(workspaceFilePath, backupPath)
      } catch {
        // Original file might not exist, that's okay
      }

      // Clean up old backups
      await this.cleanupOldBackups(backupDir)

    } catch (error) {
      // Backup creation should not fail the main operation
      console.warn('Failed to create workspace backup:', error)
    }
  }

  private async cleanupOldBackups(backupDir: string): Promise<void> {
    try {
      const files = await fs.readdir(backupDir)
      const backupFiles = files
        .filter(f => f.startsWith('workspace-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: join(backupDir, f)
        }))
        .sort((a, b) => b.name.localeCompare(a.name)) // Sort by name (timestamp) descending

      // Keep only the most recent backups
      const filesToDelete = backupFiles.slice(this.autoSaveConfig.maxBackups)
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path)
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error)
    }
  }

  private markDirty(): void {
    this.isDirty = true
    this.emit('workspace-dirty')
  }

  private startAutoSave(): void {
    this.stopAutoSave()
    
    if (this.autoSaveConfig.enabled) {
      this.autoSaveTimer = setInterval(async () => {
        if (this.isDirty && this.currentWorkspace) {
          try {
            await this.saveWorkspace()
          } catch (error) {
            this.emit('auto-save-error', error)
          }
        }
      }, this.autoSaveConfig.interval)
    }
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  private handleWorkspaceError(error: any, path?: string, suggestedActions: string[] = []): WorkspaceError {
    let message = 'Workspace operation failed'
    let code = 'UNKNOWN'

    if (error.code) {
      code = error.code
      switch (error.code) {
        case 'ENOENT':
          message = `Workspace file not found: ${path}`
          break
        case 'EACCES':
          message = `Permission denied: ${path}`
          break
        case 'ENOTDIR':
          message = `Not a directory: ${path}`
          break
        case 'EISDIR':
          message = `Is a directory: ${path}`
          break
        case 'ENOSPC':
          message = 'No space left on device'
          break
        default:
          message = error.message || message
      }
    } else if (error.message) {
      message = error.message
    }

    return new WorkspaceError(message, code, path, suggestedActions)
  }
}