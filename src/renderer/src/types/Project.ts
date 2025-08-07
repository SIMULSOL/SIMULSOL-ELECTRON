// Renderer process project types

import { ProjectStructure, FileNode } from '../../../shared/types/Project'

export interface ProjectExplorer {
  loadProject(projectPath: string): Promise<void>
  refreshProject(): Promise<void>
  createFile(path: string, type: FileType): Promise<void>
  deleteFile(path: string): Promise<void>
  renameFile(oldPath: string, newPath: string): Promise<void>
  getSelectedFiles(): string[]
  expandNode(path: string): void
  collapseNode(path: string): void
  selectNode(path: string): void
}

export interface FileType {
  name: string
  extension: string
  icon: string
  template?: string
}

export interface ProjectTreeNode extends FileNode {
  expanded: boolean
  selected: boolean
  level: number
  icon: string
}

export interface ProjectContextMenu {
  items: ContextMenuItem[]
}

export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  accelerator?: string
  enabled: boolean
  visible: boolean
  click: (node: ProjectTreeNode) => void
  submenu?: ContextMenuItem[]
  separator?: boolean
}

export interface FileOperationResult {
  success: boolean
  error?: string
  path: string
}

export interface ProjectWatcher {
  on(event: 'file-added' | 'file-removed' | 'file-changed', callback: (path: string) => void): void
  start(): void
  stop(): void
}

export interface ProjectSearchOptions {
  query: string
  includeFiles: boolean
  includeContent: boolean
  caseSensitive: boolean
  useRegex: boolean
  excludePatterns: string[]
}

export interface ProjectSearchResult {
  file: string
  matches: SearchMatch[]
}

export interface SearchMatch {
  line: number
  column: number
  text: string
  preview: string
}