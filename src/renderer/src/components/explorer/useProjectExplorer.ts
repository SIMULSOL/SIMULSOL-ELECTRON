import { useState, useCallback, useEffect } from 'react'
import { FileNode } from './ProjectExplorer'

export interface ProjectValidationError {
  file: string
  message: string
  suggestion: string
}

export interface ProjectExplorerState {
  files: FileNode[]
  selectedFiles: string[]
  projectPath: string | null
  isLoading: boolean
  error: string | null
  validationErrors: ProjectValidationError[]
}

export interface ProjectExplorerActions {
  loadProject: (projectPath: string) => Promise<void>
  refreshProject: () => Promise<void>
  selectFile: (filePath: string, isMultiSelect?: boolean) => void
  openFile: (filePath: string) => void
  createFile: (parentPath: string, name: string, type: 'file' | 'directory') => Promise<void>
  deleteFile: (filePath: string) => Promise<void>
  renameFile: (oldPath: string, newName: string) => Promise<void>
  clearSelection: () => void
  validateProject: () => void
}

export const useProjectExplorer = (): [ProjectExplorerState, ProjectExplorerActions] => {
  const [state, setState] = useState<ProjectExplorerState>({
    files: [],
    selectedFiles: [],
    projectPath: null,
    isLoading: false,
    error: null,
    validationErrors: []
  })

  const updateState = useCallback((updates: Partial<ProjectExplorerState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const validateProjectConfiguration = useCallback((files: FileNode[]): ProjectValidationError[] => {
    const errors: ProjectValidationError[] = []
    const fileNames = new Set<string>()
    
    // Collect all file names recursively
    const collectFileNames = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        fileNames.add(node.name)
        if (node.children) {
          collectFileNames(node.children)
        }
      })
    }
    collectFileNames(files)
    
    // Check for required Solana project files
    if (!fileNames.has('Cargo.toml')) {
      errors.push({
        file: 'Cargo.toml',
        message: 'Missing Cargo.toml file - required for Rust/Solana projects',
        suggestion: 'Create a Cargo.toml file with proper Solana dependencies. Use "cargo init" or create from template.'
      })
    }
    
    // Check for Anchor project structure
    const hasAnchorToml = fileNames.has('Anchor.toml')
    const hasAnchorPrograms = fileNames.has('programs')
    
    if (hasAnchorToml && !hasAnchorPrograms) {
      errors.push({
        file: 'programs/',
        message: 'Anchor.toml found but missing programs directory',
        suggestion: 'Create a "programs" directory to contain your Anchor programs, or remove Anchor.toml if this is not an Anchor project.'
      })
    }
    
    // Check for src directory in Rust projects
    if (fileNames.has('Cargo.toml') && !fileNames.has('src')) {
      errors.push({
        file: 'src/',
        message: 'Missing src directory - required for Rust projects',
        suggestion: 'Create a "src" directory with a lib.rs or main.rs file to define your program entry point.'
      })
    }
    
    // Check for conflicting project types
    if (hasAnchorToml && fileNames.has('src') && !hasAnchorPrograms) {
      errors.push({
        file: 'Project Structure',
        message: 'Mixed project structure detected - both Anchor and native Rust files',
        suggestion: 'Choose either Anchor framework (use programs/ directory) or native Solana development (use src/ directory), not both.'
      })
    }
    
    return errors
  }, [])

  const loadProjectStructure = useCallback(async (projectPath: string): Promise<FileNode[]> => {
    try {
      // Use IPC to get project structure from main process
      if (window.electron?.ipcRenderer) {
        const structure = await window.electron.ipcRenderer.invoke('fs:get-project-structure', {
          path: projectPath
        })
        return structure
      }
      
      // Fallback mock data for development
      return [
        {
          name: 'src',
          path: `${projectPath}/src`,
          type: 'directory',
          children: [
            {
              name: 'lib.rs',
              path: `${projectPath}/src/lib.rs`,
              type: 'file',
              metadata: { size: 1024, modified: new Date() }
            },
            {
              name: 'processor.rs',
              path: `${projectPath}/src/processor.rs`,
              type: 'file',
              metadata: { size: 2048, modified: new Date() }
            }
          ]
        },
        {
          name: 'tests',
          path: `${projectPath}/tests`,
          type: 'directory',
          children: [
            {
              name: 'integration.rs',
              path: `${projectPath}/tests/integration.rs`,
              type: 'file',
              metadata: { size: 512, modified: new Date() }
            }
          ]
        },
        {
          name: 'Cargo.toml',
          path: `${projectPath}/Cargo.toml`,
          type: 'file',
          metadata: { size: 256, modified: new Date() }
        },
        {
          name: 'Anchor.toml',
          path: `${projectPath}/Anchor.toml`,
          type: 'file',
          metadata: { size: 128, modified: new Date() }
        }
      ]
    } catch (error) {
      console.error('Failed to load project structure:', error)
      throw error
    }
  }, [])

  const loadProject = useCallback(async (projectPath: string) => {
    updateState({ isLoading: true, error: null, validationErrors: [] })
    
    try {
      const files = await loadProjectStructure(projectPath)
      const validationErrors = validateProjectConfiguration(files)
      
      updateState({
        files,
        projectPath,
        isLoading: false,
        selectedFiles: [],
        validationErrors
      })
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load project'
      })
    }
  }, [loadProjectStructure, validateProjectConfiguration, updateState])

  const refreshProject = useCallback(async () => {
    if (state.projectPath) {
      await loadProject(state.projectPath)
    }
  }, [state.projectPath, loadProject])

  const selectFile = useCallback((filePath: string, isMultiSelect = false) => {
    updateState({
      selectedFiles: isMultiSelect
        ? state.selectedFiles.includes(filePath)
          ? state.selectedFiles.filter(path => path !== filePath)
          : [...state.selectedFiles, filePath]
        : [filePath]
    })
  }, [state.selectedFiles, updateState])

  const openFile = useCallback((filePath: string) => {
    // Emit file open event or call IPC
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('editor:open-file', { path: filePath })
    }
    
    // Also select the file
    selectFile(filePath)
  }, [selectFile])

  const createFile = useCallback(async (parentPath: string, name: string, type: 'file' | 'directory') => {
    try {
      updateState({ isLoading: true, error: null })
      
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('fs:create-file', {
          parentPath,
          name,
          type
        })
      } else {
        // Mock implementation for development
        console.log(`Creating ${type}: ${parentPath}/${name}`)
      }
      
      // Refresh the project structure
      await refreshProject()
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : `Failed to create ${type}`
      })
      throw error
    }
  }, [refreshProject, updateState])

  const deleteFile = useCallback(async (filePath: string) => {
    try {
      updateState({ isLoading: true, error: null })
      
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('fs:delete-file', {
          path: filePath
        })
      } else {
        // Mock implementation for development
        console.log(`Deleting: ${filePath}`)
      }
      
      // Remove from selection if selected
      updateState({
        selectedFiles: state.selectedFiles.filter(path => path !== filePath)
      })
      
      // Refresh the project structure
      await refreshProject()
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete file'
      })
      throw error
    }
  }, [state.selectedFiles, refreshProject, updateState])

  const renameFile = useCallback(async (oldPath: string, newName: string) => {
    try {
      updateState({ isLoading: true, error: null })
      
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'))
      const newPath = `${parentPath}/${newName}`
      
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('fs:rename-file', {
          oldPath,
          newPath
        })
      } else {
        // Mock implementation for development
        console.log(`Renaming: ${oldPath} -> ${newPath}`)
      }
      
      // Update selection if the renamed file was selected
      updateState({
        selectedFiles: state.selectedFiles.map(path => 
          path === oldPath ? newPath : path
        )
      })
      
      // Refresh the project structure
      await refreshProject()
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to rename file'
      })
      throw error
    }
  }, [state.selectedFiles, refreshProject, updateState])

  const clearSelection = useCallback(() => {
    updateState({ selectedFiles: [] })
  }, [updateState])

  const validateProject = useCallback(() => {
    if (state.files.length > 0) {
      const validationErrors = validateProjectConfiguration(state.files)
      updateState({ validationErrors })
    }
  }, [state.files, validateProjectConfiguration, updateState])

  // Auto-load project if projectPath is set
  useEffect(() => {
    if (state.projectPath && state.files.length === 0 && !state.isLoading) {
      loadProject(state.projectPath)
    }
  }, [state.projectPath, state.files.length, state.isLoading, loadProject])

  const actions: ProjectExplorerActions = {
    loadProject,
    refreshProject,
    selectFile,
    openFile,
    createFile,
    deleteFile,
    renameFile,
    clearSelection,
    validateProject
  }

  return [state, actions]
}

export default useProjectExplorer