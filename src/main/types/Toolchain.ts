// Main process toolchain management types

import { BuildConfig, BuildResult, DeployConfig, DeployResult } from '../../shared/types/Build'
import { TestConfig, TestResult } from '../../shared/types/Test'
import { SolanaProjectTemplate, ProjectStructure } from '../../shared/types/Project'

export interface ToolchainController {
  detectSolanaInstallation(): Promise<SolanaInstallation>
  validateInstallation(): Promise<ValidationResult>
  compileProgram(projectPath: string, options: CompileOptions): Promise<CompileResult>
  runTests(projectPath: string, testOptions: TestOptions): Promise<TestResult>
  deployProgram(programPath: string, network: string): Promise<DeployResult>
  createProject(template: SolanaProjectTemplate): Promise<ProjectStructure>
  buildProgram(config: BuildConfig): Promise<BuildResult>
  testProgram(config: TestConfig): Promise<TestResult>
}

export interface SolanaInstallation {
  version: string
  path: string
  isValid: boolean
  components: ToolchainComponent[]
}

export interface ToolchainComponent {
  name: string
  version: string
  path: string
  isInstalled: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  recommendations: string[]
}

export interface ValidationError {
  component: string
  message: string
  fix?: string
}

export interface ValidationWarning {
  component: string
  message: string
  suggestion?: string
}

export interface CompileOptions {
  release: boolean
  features: string[]
  target?: string
  verbose: boolean
}

export interface CompileResult extends BuildResult {
  idlPath?: string
  keypairPath?: string
}

export interface TestOptions {
  filter?: string
  verbose: boolean
  coverage: boolean
  parallel: boolean
  timeout?: number
}

export interface SolanaToolchain {
  validateInstallation(): Promise<ValidationResult>
  createProject(template: SolanaProjectTemplate): Promise<ProjectStructure>
  buildProgram(config: BuildConfig): Promise<BuildResult>
  testProgram(config: TestConfig): Promise<TestResult>
  deployProgram(config: DeployConfig): Promise<DeployResult>
}