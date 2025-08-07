import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { WorkspaceManager, WorkspaceError, WorkspaceState, OpenFile } from '../WorkspaceManager'

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    access: vi.fn(),
    readdir: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn()
  }
}))

const mockFs = fs as any

describe('WorkspaceManager', () => {
  let workspaceManager: WorkspaceManager
  const testProjectPath = '/test/project'
  const testWorkspaceFile = '.simusol-workspace.json'

  beforeEach(() => {
    workspaceManager = new WorkspaceManager()
    vi.clearAllMocks()
    
    // Mock successful directory creation and file operations by default
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.access.mockResolvedValue(undefined)
    mockFs.readdir.mockResolvedValue([])
    mockFs.copyFile.mockResolvedValue(undefined)
    mockFs.unlink.mockResolvedValue(undefined)
  })

  afterEach(() => {
    workspaceManager.cleanup()
  })

  describe('loadWorkspace', () => {
    it('should load existing workspace successfully', async () => {
      const mockWorkspaceData = {
        activeProject: testProjectPath,
        openFiles: [],
        layout: {
          panels: [],
          sidebarWidth: 250,
          bottomPanelHeight: 200,
          isBottomPanelVisible: true,
          isSidebarVisible: true
        },
        terminalSessions: [],
        preferences: {
          theme: 'dark',
          fontSize: 14,
          fontFamily: 'Monaco',
          tabSize: 2,
          insertSpaces: true,
          wordWrap: true,
          autoSave: true,
          autoSaveDelay: 1000,
          formatOnSave: true,
          showWhitespace: false,
          showLineNumbers: true
        },
        recentProjects: [testProjectPath],
        lastSaved: new Date().toISOString(),
        version: '1.0.0'
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockWorkspaceData))

      const workspace = await workspaceManager.loadWorkspace(testProjectPath)

      expect(workspace.activeProject).toBe(testProjectPath)
      expect(workspace.version).toBe('1.0.0')
      expect(mockFs.readFile).toHaveBeenCalledWith(
        join(testProjectPath, testWorkspaceFile),
        'utf8'
      )
    })

    it('should create default workspace when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      const workspace = await workspaceManager.loadWorkspace(testProjectPath)

      expect(workspace.activeProject).toBe(testProjectPath)
      expect(workspace.openFiles).toEqual([])
      expect(workspace.preferences.theme).toBe('dark')
      expect(workspace.layout.panels).toHaveLength(3) // explorer, editor, terminal
    })

    it('should emit workspace-loaded event', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      
      const eventSpy = vi.fn()
      workspaceManager.on('workspace-loaded', eventSpy)

      const workspace = await workspaceManager.loadWorkspace(testProjectPath)

      expect(eventSpy).toHaveBeenCalledWith(workspace)
    })

    it('should handle corrupted workspace file', async () => {
      mockFs.readFile.mockResolvedValue('invalid json')

      const workspace = await workspaceManager.loadWorkspace(testProjectPath)

      // Should create default workspace when JSON parsing fails
      expect(workspace.activeProject).toBe(testProjectPath)
      expect(workspace.openFiles).toEqual([])
    })
  })

  describe('saveWorkspace', () => {
    it('should save workspace successfully', async () => {
      // First load a workspace
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      await workspaceManager.saveWorkspace()

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        join(testProjectPath, testWorkspaceFile),
        expect.stringContaining(testProjectPath),
        'utf8'
      )
    })

    it('should create backup before saving', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      await workspaceManager.saveWorkspace()

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        join(testProjectPath, '.workspace-backups'),
        { recursive: true }
      )
    })

    it('should emit workspace-saved event', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const eventSpy = vi.fn()
      workspaceManager.on('workspace-saved', eventSpy)

      await workspaceManager.saveWorkspace()

      expect(eventSpy).toHaveBeenCalled()
    })

    it('should throw error when no workspace is loaded', async () => {
      await expect(workspaceManager.saveWorkspace()).rejects.toThrow(WorkspaceError)
    })

    it('should handle file write errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const error = new Error('Permission denied')
      error.code = 'EACCES'
      mockFs.writeFile.mockRejectedValue(error)

      await expect(workspaceManager.saveWorkspace()).rejects.toThrow(WorkspaceError)
    })
  })

  describe('setActiveProject', () => {
    it('should set active project successfully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const newProjectPath = '/new/project'
      await workspaceManager.setActiveProject(newProjectPath)

      const workspace = workspaceManager.getCurrentWorkspace()
      expect(workspace?.activeProject).toBe(newProjectPath)
    })

    it('should emit active-project-changed event', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const eventSpy = vi.fn()
      workspaceManager.on('active-project-changed', eventSpy)

      const newProjectPath = '/new/project'
      await workspaceManager.setActiveProject(newProjectPath)

      expect(eventSpy).toHaveBeenCalledWith(newProjectPath)
    })

    it('should throw error when no workspace is loaded', async () => {
      await expect(workspaceManager.setActiveProject('/some/path')).rejects.toThrow(WorkspaceError)
    })

    it('should throw error when project path does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      mockFs.access.mockRejectedValue(new Error('Path not found'))

      await expect(workspaceManager.setActiveProject('/nonexistent')).rejects.toThrow(WorkspaceError)
    })
  })

  describe('updateOpenFile', () => {
    it('should add new open file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const filePath = '/test/file.rs'
      const fileUpdates: Partial<OpenFile> = {
        content: 'fn main() {}',
        isDirty: true,
        isActive: true
      }

      workspaceManager.updateOpenFile(filePath, fileUpdates)

      const workspace = workspaceManager.getCurrentWorkspace()
      expect(workspace?.openFiles).toHaveLength(1)
      expect(workspace?.openFiles[0].path).toBe(filePath)
      expect(workspace?.openFiles[0].content).toBe('fn main() {}')
      expect(workspace?.openFiles[0].isDirty).toBe(true)
    })

    it('should update existing open file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const filePath = '/test/file.rs'
      
      // Add file first
      workspaceManager.updateOpenFile(filePath, { content: 'initial' })
      
      // Update file
      workspaceManager.updateOpenFile(filePath, { content: 'updated', isDirty: true })

      const workspace = workspaceManager.getCurrentWorkspace()
      expect(workspace?.openFiles).toHaveLength(1)
      expect(workspace?.openFiles[0].content).toBe('updated')
      expect(workspace?.openFiles[0].isDirty).toBe(true)
    })

    it('should emit file-updated event', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const eventSpy = vi.fn()
      workspaceManager.on('file-updated', eventSpy)

      const filePath = '/test/file.rs'
      const updates = { content: 'test' }
      workspaceManager.updateOpenFile(filePath, updates)

      expect(eventSpy).toHaveBeenCalledWith(filePath, updates)
    })
  })

  describe('closeFile', () => {
    it('should remove open file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const filePath = '/test/file.rs'
      workspaceManager.updateOpenFile(filePath, { content: 'test' })
      
      expect(workspaceManager.getCurrentWorkspace()?.openFiles).toHaveLength(1)

      workspaceManager.closeFile(filePath)

      expect(workspaceManager.getCurrentWorkspace()?.openFiles).toHaveLength(0)
    })

    it('should emit file-closed event', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const eventSpy = vi.fn()
      workspaceManager.on('file-closed', eventSpy)

      const filePath = '/test/file.rs'
      workspaceManager.updateOpenFile(filePath, { content: 'test' })
      workspaceManager.closeFile(filePath)

      expect(eventSpy).toHaveBeenCalledWith(filePath)
    })
  })

  describe('updateLayout', () => {
    it('should update layout state', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const layoutUpdates = {
        sidebarWidth: 300,
        isBottomPanelVisible: false
      }

      workspaceManager.updateLayout(layoutUpdates)

      const workspace = workspaceManager.getCurrentWorkspace()
      expect(workspace?.layout.sidebarWidth).toBe(300)
      expect(workspace?.layout.isBottomPanelVisible).toBe(false)
    })

    it('should emit layout-updated event', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const eventSpy = vi.fn()
      workspaceManager.on('layout-updated', eventSpy)

      const layoutUpdates = { sidebarWidth: 300 }
      workspaceManager.updateLayout(layoutUpdates)

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        sidebarWidth: 300
      }))
    })
  })

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const preferenceUpdates = {
        theme: 'light' as const,
        fontSize: 16
      }

      workspaceManager.updatePreferences(preferenceUpdates)

      const workspace = workspaceManager.getCurrentWorkspace()
      expect(workspace?.preferences.theme).toBe('light')
      expect(workspace?.preferences.fontSize).toBe(16)
    })

    it('should emit preferences-updated event', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const eventSpy = vi.fn()
      workspaceManager.on('preferences-updated', eventSpy)

      const preferenceUpdates = { theme: 'light' as const }
      workspaceManager.updatePreferences(preferenceUpdates)

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        theme: 'light'
      }))
    })
  })

  describe('terminal session management', () => {
    it('should add new terminal session', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const sessionId = 'terminal-1'
      const sessionUpdates = {
        cwd: '/test/path',
        title: 'Test Terminal',
        isActive: true
      }

      workspaceManager.updateTerminalSession(sessionId, sessionUpdates)

      const workspace = workspaceManager.getCurrentWorkspace()
      expect(workspace?.terminalSessions).toHaveLength(1)
      expect(workspace?.terminalSessions[0].id).toBe(sessionId)
      expect(workspace?.terminalSessions[0].title).toBe('Test Terminal')
    })

    it('should update existing terminal session', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const sessionId = 'terminal-1'
      
      // Add session first
      workspaceManager.updateTerminalSession(sessionId, { title: 'Initial' })
      
      // Update session
      workspaceManager.updateTerminalSession(sessionId, { title: 'Updated', isActive: true })

      const workspace = workspaceManager.getCurrentWorkspace()
      expect(workspace?.terminalSessions).toHaveLength(1)
      expect(workspace?.terminalSessions[0].title).toBe('Updated')
      expect(workspace?.terminalSessions[0].isActive).toBe(true)
    })

    it('should remove terminal session', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      const sessionId = 'terminal-1'
      workspaceManager.updateTerminalSession(sessionId, { title: 'Test' })
      
      expect(workspaceManager.getCurrentWorkspace()?.terminalSessions).toHaveLength(1)

      workspaceManager.removeTerminalSession(sessionId)

      expect(workspaceManager.getCurrentWorkspace()?.terminalSessions).toHaveLength(0)
    })
  })

  describe('isDirtyWorkspace', () => {
    it('should return false for clean workspace', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      expect(workspaceManager.isDirtyWorkspace()).toBe(false)
    })

    it('should return true after making changes', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      workspaceManager.updateOpenFile('/test/file.rs', { content: 'test' })

      expect(workspaceManager.isDirtyWorkspace()).toBe(true)
    })

    it('should return false after saving', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      workspaceManager.updateOpenFile('/test/file.rs', { content: 'test' })
      expect(workspaceManager.isDirtyWorkspace()).toBe(true)

      await workspaceManager.saveWorkspace()
      expect(workspaceManager.isDirtyWorkspace()).toBe(false)
    })
  })

  describe('recovery functionality', () => {
    it('should create recovery file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      workspaceManager.updateOpenFile('/test/file.rs', { content: 'test', isDirty: true })

      await workspaceManager.createRecoveryFile()

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        join(testProjectPath, '.simusol-recovery.json'),
        expect.stringContaining('recoveryTimestamp'),
        'utf8'
      )
    })

    it('should recover workspace from recovery file', async () => {
      const recoveryData = {
        activeProject: testProjectPath,
        openFiles: [{ path: '/test/file.rs', content: 'recovered', isDirty: true }],
        recoveryTimestamp: new Date().toISOString()
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(recoveryData))

      const recovered = await workspaceManager.recoverWorkspace(testProjectPath)

      expect(recovered).toBeDefined()
      expect(recovered?.openFiles).toHaveLength(1)
      expect(recovered?.openFiles[0].content).toBe('recovered')
      expect(mockFs.unlink).toHaveBeenCalledWith(join(testProjectPath, '.simusol-recovery.json'))
    })

    it('should return null when no recovery file exists', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      const recovered = await workspaceManager.recoverWorkspace(testProjectPath)

      expect(recovered).toBeNull()
    })
  })

  describe('auto-save configuration', () => {
    it('should configure auto-save settings', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      workspaceManager.configureAutoSave({
        enabled: true,
        interval: 5000,
        maxBackups: 10
      })

      // Auto-save configuration is internal, but we can test that it doesn't throw
      expect(() => workspaceManager.configureAutoSave({ enabled: false })).not.toThrow()
    })

    it('should force save immediately', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))
      await workspaceManager.loadWorkspace(testProjectPath)

      workspaceManager.updateOpenFile('/test/file.rs', { content: 'test' })
      expect(workspaceManager.isDirtyWorkspace()).toBe(true)

      await workspaceManager.forceSave()

      expect(workspaceManager.isDirtyWorkspace()).toBe(false)
      expect(mockFs.writeFile).toHaveBeenCalled()
    })
  })

  describe('getRecentWorkspaces', () => {
    it('should return empty array when no recent projects exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'))

      const recentWorkspaces = await workspaceManager.getRecentWorkspaces()

      expect(recentWorkspaces).toEqual([])
    })

    it('should return valid recent projects', async () => {
      const recentProjects = [
        {
          name: 'project1',
          path: '/path/to/project1',
          lastOpened: new Date().toISOString(),
          projectType: 'anchor'
        },
        {
          name: 'project2',
          path: '/path/to/project2',
          lastOpened: new Date().toISOString(),
          projectType: 'native'
        }
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(recentProjects))

      const recentWorkspaces = await workspaceManager.getRecentWorkspaces()

      expect(recentWorkspaces).toHaveLength(2)
      expect(recentWorkspaces[0].name).toBe('project1')
    })

    it('should filter out non-existent projects', async () => {
      const recentProjects = [
        {
          name: 'existing',
          path: '/existing/project',
          lastOpened: new Date().toISOString(),
          projectType: 'anchor'
        },
        {
          name: 'missing',
          path: '/missing/project',
          lastOpened: new Date().toISOString(),
          projectType: 'native'
        }
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(recentProjects))
      mockFs.access.mockImplementation((path) => {
        if (path === '/existing/project') {
          return Promise.resolve()
        }
        return Promise.reject(new Error('Not found'))
      })

      const recentWorkspaces = await workspaceManager.getRecentWorkspaces()

      expect(recentWorkspaces).toHaveLength(1)
      expect(recentWorkspaces[0].name).toBe('existing')
    })
  })
})