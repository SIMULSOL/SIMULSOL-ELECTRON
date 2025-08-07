// Main process project management types

import { ProjectStructure, ProjectConfiguration } from '../../shared/types/Project'

export interface ProjectManager {
  createProject(template: string, path: string, options: ProjectCreateOptions): Promise<ProjectStructure>
  loadProject(path: string): Promise<ProjectStructure>
  validateProject(path: string): Promise<ProjectValidationResult>
  getProjectConfiguration(path: string): Promise<ProjectConfiguration>
  updateProjectConfiguration(path: string, config: Partial<ProjectConfiguration>): Promise<void>
}

export interface ProjectCreateOptions {
  name: string
  author?: string
  description?: string
  template: string
  features?: string[]
  includeTests?: boolean
  includeClient?: boolean
}

export interface ProjectValidationResult {
  isValid: boolean
  errors: ProjectValidationError[]
  warnings: ProjectValidationWarning[]
  suggestions: string[]
}

export interface ProjectValidationError {
  file: string
  message: string
  line?: number
  column?: number
}

export interface ProjectValidationWarning {
  file: string
  message: string
  line?: number
  column?: number
  suggestion?: string
}