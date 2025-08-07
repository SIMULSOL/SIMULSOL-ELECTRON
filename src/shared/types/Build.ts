// Build and compilation related types

import { Diagnostic } from './Common'

export interface BuildConfig {
  projectPath: string
  target?: string
  release?: boolean
  features?: string[]
  clean?: boolean
  verbose?: boolean
}

export interface BuildResult {
  success: boolean
  artifacts: BuildArtifact[]
  errors: CompileError[]
  warnings: CompileWarning[]
  duration: number
  outputPath?: string
}

export interface BuildArtifact {
  name: string
  path: string
  type: 'binary' | 'library' | 'idl' | 'keypair'
  size: number
}

export interface CompileError {
  file: string
  line: number
  column: number
  message: string
  code?: string
  severity: 'error' | 'warning'
  suggestion?: string
}

export interface CompileWarning extends CompileError {
  severity: 'warning'
}

export interface CompileOptions {
  release: boolean
  features: string[]
  target?: string
  verbose: boolean
}

export interface DeployConfig {
  programPath: string
  network: string
  keypairPath?: string
  programId?: string
  upgradeAuthority?: string
}

export interface DeployResult {
  success: boolean
  programId: string
  transactionId: string
  network: string
  error?: string
}