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