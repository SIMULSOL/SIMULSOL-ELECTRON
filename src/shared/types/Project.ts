// Project-related types

import { FileMetadata, Dependency } from './Common'

export type ProjectType = 'anchor' | 'native' | 'token'

export interface ProjectStructure {
  name: string
  path: string
  type: ProjectType
  files: FileNode[]
  configuration: ProjectConfiguration
  dependencies: Dependency[]
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  metadata: FileMetadata
}

export interface ProjectConfiguration {
  name: string
  version: string
  authors: string[]
  description?: string
  solanaVersion?: string
  anchorVersion?: string
  rustVersion?: string
  features?: string[]
  workspace?: boolean
}

export interface ProjectTemplate {
  name: string
  type: ProjectType
  description: string
  files: TemplateFile[]
  dependencies: Dependency[]
}

export interface TemplateFile {
  path: string
  content: string
  isTemplate: boolean
  variables?: Record<string, string>
}

export interface SolanaProjectTemplate extends ProjectTemplate {
  programType: 'anchor' | 'native' | 'token'
  includeTests: boolean
  includeClient: boolean
}