// Main process file system types

import { ProjectStructure, ProjectTemplate } from '../../shared/types/Project'

export interface FileSystemManager {
  createProject(template: ProjectTemplate, path: string): Promise<ProjectStructure>
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  watchFiles(patterns: string[]): FileWatcher
  getProjectStructure(rootPath: string): Promise<ProjectStructure>
  createDirectory(path: string): Promise<void>
  copyFile(source: string, destination: string): Promise<void>
  moveFile(source: string, destination: string): Promise<void>
}

export interface FileWatcher {
  on(event: 'change' | 'add' | 'unlink', callback: (path: string) => void): void
  close(): void
}

export interface FileSystemError extends Error {
  code: string
  path: string
  operation: string
}