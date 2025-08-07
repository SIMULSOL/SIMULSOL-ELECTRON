// Example usage of the IPC client in the renderer process

// This file demonstrates how to use the IPC client API in React components

export class SolanaIDEService {
  private api = window.api

  // File System Operations
  async readFile(path: string): Promise<string> {
    try {
      const result = await this.api.fileSystem.readFile(path)
      return result.content
    } catch (error) {
      console.error('Failed to read file:', error)
      throw error
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      await this.api.fileSystem.writeFile(path, content)
    } catch (error) {
      console.error('Failed to write file:', error)
      throw error
    }
  }

  async createProject(template: any, path: string, name: string): Promise<any> {
    try {
      const result = await this.api.project.create(template, path, name)
      return result.project
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  }

  // Process Operations
  async executeCommand(command: string, args: string[], cwd: string): Promise<{
    exitCode: number
    stdout: string
    stderr: string
  }> {
    try {
      const result = await this.api.process.execute(command, args, cwd)
      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    } catch (error) {
      console.error('Failed to execute command:', error)
      throw error
    }
  }

  // Terminal Operations
  async createTerminal(cwd: string): Promise<{ terminalId: string; pid: number }> {
    try {
      const result = await this.api.terminal.create(cwd)
      return result
    } catch (error) {
      console.error('Failed to create terminal:', error)
      throw error
    }
  }

  async sendTerminalInput(terminalId: string, input: string): Promise<void> {
    try {
      await this.api.terminal.sendInput(terminalId, input)
    } catch (error) {
      console.error('Failed to send terminal input:', error)
      throw error
    }
  }

  // Build Operations
  async buildProject(projectPath: string, options: { release?: boolean } = {}): Promise<any> {
    try {
      const result = await this.api.build.program({
        projectPath,
        release: options.release || false
      })
      return result
    } catch (error) {
      console.error('Failed to build project:', error)
      throw error
    }
  }

  // Test Operations
  async runTests(projectPath: string, options: { verbose?: boolean } = {}): Promise<any> {
    try {
      const result = await this.api.test.run({
        projectPath,
        verbose: options.verbose || false
      })
      return result
    } catch (error) {
      console.error('Failed to run tests:', error)
      throw error
    }
  }

  // Workspace Operations
  async loadWorkspace(path: string): Promise<any> {
    try {
      const result = await this.api.workspace.load(path)
      return result.workspace
    } catch (error) {
      console.error('Failed to load workspace:', error)
      throw error
    }
  }

  async saveWorkspace(workspace: any): Promise<void> {
    try {
      await this.api.workspace.save(workspace)
    } catch (error) {
      console.error('Failed to save workspace:', error)
      throw error
    }
  }

  async getRecentWorkspaces(): Promise<any[]> {
    try {
      const result = await this.api.workspace.getRecent()
      return result.workspaces
    } catch (error) {
      console.error('Failed to get recent workspaces:', error)
      throw error
    }
  }

  // Toolchain Operations
  async detectToolchain(): Promise<{
    detected: boolean
    version?: string
    components: Array<{ name: string; version: string; path: string }>
  }> {
    try {
      const result = await this.api.toolchain.detect()
      return result
    } catch (error) {
      console.error('Failed to detect toolchain:', error)
      throw error
    }
  }

  async validateToolchain(): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    try {
      const result = await this.api.toolchain.validate()
      return result
    } catch (error) {
      console.error('Failed to validate toolchain:', error)
      throw error
    }
  }

  // Event Listeners
  setupEventListeners(): () => void {
    const unsubscribeFunctions: Array<() => void> = []

    // File change events
    const unsubscribeFileChanged = this.api.events.onFileChanged((data) => {
      console.log('File changed:', data)
      // Handle file change event
    })
    unsubscribeFunctions.push(unsubscribeFileChanged)

    // Process output events
    const unsubscribeProcessOutput = this.api.events.onProcessOutput((data) => {
      console.log('Process output:', data)
      // Handle process output event
    })
    unsubscribeFunctions.push(unsubscribeProcessOutput)

    // Terminal output events
    const unsubscribeTerminalOutput = this.api.events.onTerminalOutput((data) => {
      console.log('Terminal output:', data)
      // Handle terminal output event
    })
    unsubscribeFunctions.push(unsubscribeTerminalOutput)

    // Build progress events
    const unsubscribeBuildProgress = this.api.events.onBuildProgress((data) => {
      console.log('Build progress:', data)
      // Handle build progress event
    })
    unsubscribeFunctions.push(unsubscribeBuildProgress)

    // Test progress events
    const unsubscribeTestProgress = this.api.events.onTestProgress((data) => {
      console.log('Test progress:', data)
      // Handle test progress event
    })
    unsubscribeFunctions.push(unsubscribeTestProgress)

    // Return cleanup function
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe())
    }
  }
}

// Example React hook for using the service
export function useSolanaIDE() {
  const service = new SolanaIDEService()

  return {
    // File operations
    readFile: service.readFile.bind(service),
    writeFile: service.writeFile.bind(service),
    
    // Project operations
    createProject: service.createProject.bind(service),
    
    // Process operations
    executeCommand: service.executeCommand.bind(service),
    
    // Terminal operations
    createTerminal: service.createTerminal.bind(service),
    sendTerminalInput: service.sendTerminalInput.bind(service),
    
    // Build operations
    buildProject: service.buildProject.bind(service),
    
    // Test operations
    runTests: service.runTests.bind(service),
    
    // Workspace operations
    loadWorkspace: service.loadWorkspace.bind(service),
    saveWorkspace: service.saveWorkspace.bind(service),
    getRecentWorkspaces: service.getRecentWorkspaces.bind(service),
    
    // Toolchain operations
    detectToolchain: service.detectToolchain.bind(service),
    validateToolchain: service.validateToolchain.bind(service),
    
    // Event setup
    setupEventListeners: service.setupEventListeners.bind(service)
  }
}

// Example usage in a React component:
/*
import React, { useEffect, useState } from 'react'
import { useSolanaIDE } from './utils/ipc-example'

export function ProjectManager() {
  const ide = useSolanaIDE()
  const [projects, setProjects] = useState([])
  const [toolchainStatus, setToolchainStatus] = useState(null)

  useEffect(() => {
    // Load recent projects
    ide.getRecentWorkspaces().then(setProjects)
    
    // Check toolchain status
    ide.detectToolchain().then(setToolchainStatus)
    
    // Setup event listeners
    const cleanup = ide.setupEventListeners()
    
    return cleanup
  }, [])

  const handleCreateProject = async () => {
    try {
      const template = { name: 'anchor', type: 'anchor', files: [], directories: [] }
      const project = await ide.createProject(template, '/path/to/project', 'my-project')
      console.log('Project created:', project)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleBuildProject = async (projectPath: string) => {
    try {
      const result = await ide.buildProject(projectPath, { release: true })
      console.log('Build result:', result)
    } catch (error) {
      console.error('Build failed:', error)
    }
  }

  return (
    <div>
      <h2>Project Manager</h2>
      <button onClick={handleCreateProject}>Create Project</button>
      
      <h3>Recent Projects</h3>
      <ul>
        {projects.map(project => (
          <li key={project.path}>
            {project.name}
            <button onClick={() => handleBuildProject(project.path)}>
              Build
            </button>
          </li>
        ))}
      </ul>
      
      <h3>Toolchain Status</h3>
      {toolchainStatus && (
        <div>
          <p>Detected: {toolchainStatus.detected ? 'Yes' : 'No'}</p>
          {toolchainStatus.version && <p>Version: {toolchainStatus.version}</p>}
        </div>
      )}
    </div>
  )
}
*/
// Enha
nced IPC Client Examples with Error Handling and Retry Logic
// These examples demonstrate the enhanced capabilities added in task 3.3

export class EnhancedSolanaIDEService extends SolanaIDEService {
  // Enhanced file operations with retry and recovery
  async readFileWithRetry(path: string, maxAttempts: number = 3): Promise<string> {
    try {
      const result = await this.api.fileSystem.readFileWithRetry(path, maxAttempts)
      return result.content
    } catch (error) {
      console.error('Failed to read file with retry:', error)
      throw error
    }
  }

  async writeFileWithRecovery(
    path: string, 
    content: string,
    options?: {
      maxAttempts?: number
      onRetry?: (attempt: number, error: any) => void
      onRecovery?: (error: any) => Promise<boolean>
    }
  ): Promise<void> {
    try {
      await this.api.fileSystem.writeFileWithRecovery(path, content, options)
    } catch (error) {
      console.error('Failed to write file with recovery:', error)
      throw error
    }
  }

  // Enhanced project operations
  async createProjectWithRecovery(
    template: any, 
    path: string, 
    name: string,
    options?: {
      maxAttempts?: number
      onRetry?: (attempt: number, error: any) => void
      onRecovery?: (error: any) => Promise<boolean>
    }
  ): Promise<any> {
    try {
      const result = await this.api.project.createWithRecovery(template, path, name, options)
      return result.project
    } catch (error) {
      console.error('Failed to create project with recovery:', error)
      throw error
    }
  }

  async loadProjectWithRetry(path: string, maxAttempts: number = 3): Promise<any> {
    try {
      const result = await this.api.project.loadWithRetry(path, maxAttempts)
      return result.project
    } catch (error) {
      console.error('Failed to load project with retry:', error)
      throw error
    }
  }

  // Enhanced process operations
  async executeCommandWithRetry(
    command: string, 
    args: string[], 
    cwd: string,
    options?: { maxAttempts?: number; timeout?: number; env?: Record<string, string> }
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const result = await this.api.process.executeWithRetry(command, args, cwd, options)
      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }
    } catch (error) {
      console.error('Failed to execute command with retry:', error)
      throw error
    }
  }

  // Enhanced terminal operations
  async createTerminalWithRetry(
    cwd: string, 
    shell?: string, 
    env?: Record<string, string>,
    maxAttempts: number = 3
  ): Promise<{ terminalId: string; pid: number }> {
    try {
      const result = await this.api.terminal.createWithRetry(cwd, shell, env, maxAttempts)
      return result
    } catch (error) {
      console.error('Failed to create terminal with retry:', error)
      throw error
    }
  }

  // Enhanced build operations
  async buildProjectWithRetry(
    projectPath: string, 
    options: { release?: boolean } = {},
    maxAttempts: number = 3
  ): Promise<any> {
    try {
      const result = await this.api.build.programWithRetry({
        projectPath,
        release: options.release || false
      }, maxAttempts)
      return result
    } catch (error) {
      console.error('Failed to build project with retry:', error)
      throw error
    }
  }

  async buildProjectWithRecovery(
    projectPath: string,
    options: { release?: boolean } = {},
    recoveryOptions?: {
      maxAttempts?: number
      onRetry?: (attempt: number, error: any) => void
      onRecovery?: (error: any) => Promise<boolean>
    }
  ): Promise<any> {
    try {
      const result = await this.api.build.programWithRecovery({
        projectPath,
        release: options.release || false
      }, recoveryOptions)
      return result
    } catch (error) {
      console.error('Failed to build project with recovery:', error)
      throw error
    }
  }

  // Enhanced test operations
  async runTestsWithRetry(
    projectPath: string, 
    options: { verbose?: boolean } = {},
    maxAttempts: number = 3
  ): Promise<any> {
    try {
      const result = await this.api.test.runWithRetry({
        projectPath,
        verbose: options.verbose || false
      }, maxAttempts)
      return result
    } catch (error) {
      console.error('Failed to run tests with retry:', error)
      throw error
    }
  }

  async runTestsWithRecovery(
    projectPath: string,
    options: { verbose?: boolean } = {},
    recoveryOptions?: {
      maxAttempts?: number
      onRetry?: (attempt: number, error: any) => void
      onRecovery?: (error: any) => Promise<boolean>
    }
  ): Promise<any> {
    try {
      const result = await this.api.test.runWithRecovery({
        projectPath,
        verbose: options.verbose || false
      }, recoveryOptions)
      return result
    } catch (error) {
      console.error('Failed to run tests with recovery:', error)
      throw error
    }
  }

  // Enhanced workspace operations
  async saveWorkspaceWithRetry(workspace: any, maxAttempts: number = 3): Promise<void> {
    try {
      await this.api.workspace.saveWithRetry(workspace, maxAttempts)
    } catch (error) {
      console.error('Failed to save workspace with retry:', error)
      throw error
    }
  }

  async loadWorkspaceWithRetry(path: string, maxAttempts: number = 3): Promise<any> {
    try {
      const result = await this.api.workspace.loadWithRetry(path, maxAttempts)
      return result.workspace
    } catch (error) {
      console.error('Failed to load workspace with retry:', error)
      throw error
    }
  }

  // Enhanced toolchain operations
  async detectToolchainWithRetry(force: boolean = false, maxAttempts: number = 3): Promise<{
    detected: boolean
    version?: string
    components: Array<{ name: string; version: string; path: string }>
  }> {
    try {
      const result = await this.api.toolchain.detectWithRetry(force, maxAttempts)
      return result
    } catch (error) {
      console.error('Failed to detect toolchain with retry:', error)
      throw error
    }
  }

  async installToolchainWithRecovery(
    version?: string,
    force?: boolean,
    options?: {
      maxAttempts?: number
      onRetry?: (attempt: number, error: any) => void
      onRecovery?: (error: any) => Promise<boolean>
    }
  ): Promise<{ installed: boolean; version: string; path: string }> {
    try {
      const result = await this.api.toolchain.installWithRecovery(version, force, options)
      return result
    } catch (error) {
      console.error('Failed to install toolchain with recovery:', error)
      throw error
    }
  }

  // IPC utilities
  getIPCQueueStatus(): { active: number; queued: number } {
    return this.api.ipc.getQueueStatus()
  }

  clearIPCQueue(): void {
    this.api.ipc.clearQueue()
  }

  async sendCustomRequestWithRetry<T>(
    channel: string, 
    data: T, 
    maxAttempts: number = 3
  ): Promise<any> {
    try {
      return await this.api.ipc.sendRequestWithRetry(channel, data, maxAttempts)
    } catch (error) {
      console.error('Failed to send custom request with retry:', error)
      throw error
    }
  }

  async sendCustomRequestWithRecovery<T>(
    channel: string,
    data: T,
    options?: {
      timeout?: number
      maxAttempts?: number
      onRetry?: (attempt: number, error: any) => void
      onRecovery?: (error: any) => Promise<boolean>
    }
  ): Promise<any> {
    try {
      return await this.api.ipc.sendRequestWithRecovery(channel, data, options)
    } catch (error) {
      console.error('Failed to send custom request with recovery:', error)
      throw error
    }
  }
}

// Enhanced React hook with error handling and retry capabilities
export function useEnhancedSolanaIDE() {
  const service = new EnhancedSolanaIDEService()

  return {
    // Basic operations (inherited)
    ...useSolanaIDE(),
    
    // Enhanced file operations
    readFileWithRetry: service.readFileWithRetry.bind(service),
    writeFileWithRecovery: service.writeFileWithRecovery.bind(service),
    
    // Enhanced project operations
    createProjectWithRecovery: service.createProjectWithRecovery.bind(service),
    loadProjectWithRetry: service.loadProjectWithRetry.bind(service),
    
    // Enhanced process operations
    executeCommandWithRetry: service.executeCommandWithRetry.bind(service),
    
    // Enhanced terminal operations
    createTerminalWithRetry: service.createTerminalWithRetry.bind(service),
    
    // Enhanced build operations
    buildProjectWithRetry: service.buildProjectWithRetry.bind(service),
    buildProjectWithRecovery: service.buildProjectWithRecovery.bind(service),
    
    // Enhanced test operations
    runTestsWithRetry: service.runTestsWithRetry.bind(service),
    runTestsWithRecovery: service.runTestsWithRecovery.bind(service),
    
    // Enhanced workspace operations
    saveWorkspaceWithRetry: service.saveWorkspaceWithRetry.bind(service),
    loadWorkspaceWithRetry: service.loadWorkspaceWithRetry.bind(service),
    
    // Enhanced toolchain operations
    detectToolchainWithRetry: service.detectToolchainWithRetry.bind(service),
    installToolchainWithRecovery: service.installToolchainWithRecovery.bind(service),
    
    // IPC utilities
    getIPCQueueStatus: service.getIPCQueueStatus.bind(service),
    clearIPCQueue: service.clearIPCQueue.bind(service),
    sendCustomRequestWithRetry: service.sendCustomRequestWithRetry.bind(service),
    sendCustomRequestWithRecovery: service.sendCustomRequestWithRecovery.bind(service)
  }
}

// Example usage patterns for the enhanced IPC client
export const enhancedUsageExamples = {
  // Pattern 1: File operations with automatic recovery
  async fileOperationsWithRecovery() {
    const ide = new EnhancedSolanaIDEService()
    
    try {
      // Write file with automatic directory creation on permission errors
      await ide.writeFileWithRecovery(
        '/projects/my-solana-app/src/lib.rs',
        'use anchor_lang::prelude::*;',
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.log(`Retry ${attempt}: ${error.message}`)
          },
          onRecovery: async (error) => {
            if (error.code === 'FILE_ACCESS_DENIED') {
              // Try to create parent directories
              await ide.api.fileSystem.createDirectory('/projects/my-solana-app/src', true)
              return true
            }
            return false
          }
        }
      )
      
      // Read file with retry on network issues
      const content = await ide.readFileWithRetry('/projects/my-solana-app/Cargo.toml', 3)
      console.log('Project configuration:', content)
      
    } catch (error) {
      console.error('File operations failed:', error)
    }
  },

  // Pattern 2: Project creation with dependency resolution
  async projectCreationWithDependencyResolution() {
    const ide = new EnhancedSolanaIDEService()
    
    try {
      const project = await ide.createProjectWithRecovery(
        { type: 'anchor', name: 'my-dapp' },
        '/projects',
        'my-solana-dapp',
        {
          maxAttempts: 3,
          onRecovery: async (error) => {
            if (error.code === 'TOOLCHAIN_ERROR') {
              // Auto-install missing toolchain components
              await ide.installToolchainWithRecovery('stable', false, {
                onRecovery: async (toolchainError) => {
                  if (toolchainError.code === 'NETWORK_ERROR') {
                    // Wait and retry with different mirror
                    await new Promise(resolve => setTimeout(resolve, 5000))
                    return true
                  }
                  return false
                }
              })
              return true
            }
            return false
          }
        }
      )
      
      console.log('Project created successfully:', project)
    } catch (error) {
      console.error('Project creation failed:', error)
    }
  },

  // Pattern 3: Build operations with automatic dependency updates
  async buildWithDependencyManagement() {
    const ide = new EnhancedSolanaIDEService()
    
    try {
      const buildResult = await ide.buildProjectWithRecovery(
        '/projects/my-solana-dapp',
        { release: true },
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.log(`Build attempt ${attempt} failed: ${error.message}`)
          },
          onRecovery: async (error) => {
            if (error.message.includes('dependency')) {
              // Try to update dependencies
              await ide.executeCommandWithRetry(
                'cargo',
                ['update'],
                '/projects/my-solana-dapp',
                { maxAttempts: 2 }
              )
              return true
            } else if (error.code === 'TOOLCHAIN_ERROR') {
              // Validate and fix toolchain issues
              const validation = await ide.validateToolchain()
              if (!validation.valid) {
                await ide.detectToolchainWithRetry(true, 2)
                return true
              }
            }
            return false
          }
        }
      )
      
      console.log('Build completed:', buildResult)
    } catch (error) {
      console.error('Build failed after all recovery attempts:', error)
    }
  },

  // Pattern 4: Test execution with validator management
  async testWithValidatorManagement() {
    const ide = new EnhancedSolanaIDEService()
    
    try {
      const testResult = await ide.runTestsWithRecovery(
        '/projects/my-solana-dapp',
        { verbose: true },
        {
          maxAttempts: 3,
          onRecovery: async (error) => {
            if (error.message.includes('validator')) {
              // Try to start local validator
              await ide.executeCommandWithRetry(
                'solana-test-validator',
                ['--reset'],
                '/projects/my-solana-dapp',
                { maxAttempts: 2, timeout: 30000 }
              )
              
              // Wait for validator to be ready
              await new Promise(resolve => setTimeout(resolve, 5000))
              return true
            }
            return false
          }
        }
      )
      
      console.log('Tests completed:', testResult)
    } catch (error) {
      console.error('Tests failed:', error)
    }
  },

  // Pattern 5: Workspace operations with backup and recovery
  async workspaceWithBackupRecovery() {
    const ide = new EnhancedSolanaIDEService()
    
    try {
      // Load workspace with automatic backup restoration
      const workspace = await ide.loadWorkspaceWithRetry('/projects/my-workspace', 3)
      
      // Modify workspace
      workspace.preferences.theme = 'dark'
      workspace.lastSaved = new Date()
      
      // Save with automatic backup creation
      await ide.saveWorkspaceWithRetry(workspace, 3)
      
      console.log('Workspace operations completed successfully')
    } catch (error) {
      console.error('Workspace operations failed:', error)
      
      // Monitor IPC queue for debugging
      const queueStatus = ide.getIPCQueueStatus()
      console.log('IPC Queue status:', queueStatus)
      
      if (queueStatus.queued > 10) {
        console.log('Clearing overloaded IPC queue')
        ide.clearIPCQueue()
      }
    }
  }
}