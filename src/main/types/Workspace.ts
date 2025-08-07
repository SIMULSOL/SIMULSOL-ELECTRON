// Main process workspace management types

import { WorkspaceState, WorkspaceInfo } from '../../shared/types/Workspace'

export interface WorkspaceManager {
  saveWorkspace(workspace: WorkspaceState): Promise<void>
  loadWorkspace(path: string): Promise<WorkspaceState>
  getRecentWorkspaces(): Promise<WorkspaceInfo[]>
  setActiveProject(projectPath: string): Promise<void>
  createWorkspace(name: string, path: string): Promise<WorkspaceState>
  deleteWorkspace(path: string): Promise<void>
}

export interface WorkspaceConfig {
  name: string
  path: string
  autoSave: boolean
  autoSaveInterval: number
  backupCount: number
}