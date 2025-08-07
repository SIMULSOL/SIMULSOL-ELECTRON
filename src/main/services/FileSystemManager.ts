import { promises as fs, watch, FSWatcher } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { EventEmitter } from 'events'

export interface ProjectTemplate {
  name: string
  type: 'anchor' | 'native' | 'token'
  files: TemplateFile[]
  directories: string[]
}

export interface TemplateFile {
  path: string
  content: string
}

export interface ProjectStructure {
  name: string
  path: string
  type: 'anchor' | 'native' | 'token'
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

export interface FileMetadata {
  size: number
  modified: Date
  extension?: string
  isHidden: boolean
}

export interface ProjectConfiguration {
  name: string
  version: string
  solanaVersion?: string
  anchorVersion?: string
}

export interface Dependency {
  name: string
  version: string
  type: 'dev' | 'runtime'
}

export interface FileWatcher extends EventEmitter {
  close(): void
}

export class FileSystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public path?: string,
    public suggestedActions: string[] = []
  ) {
    super(message)
    this.name = 'FileSystemError'
  }
}

export class FileSystemManager {
  private watchers: Map<string, FSWatcher> = new Map()

  /**
   * Creates a new Solana project from a template
   */
  async createProject(template: ProjectTemplate, projectPath: string): Promise<ProjectStructure> {
    try {
      // Ensure the project directory exists
      await this.ensureDirectory(projectPath)

      // Create directory structure
      for (const dir of template.directories) {
        const dirPath = join(projectPath, dir)
        await this.ensureDirectory(dirPath)
      }

      // Create template files
      for (const file of template.files) {
        const filePath = join(projectPath, file.path)
        await this.ensureDirectory(dirname(filePath))
        await fs.writeFile(filePath, file.content, 'utf8')
      }

      // Generate project structure
      const projectStructure = await this.getProjectStructure(projectPath)
      
      return {
        ...projectStructure,
        name: template.name,
        type: template.type
      }
    } catch (error) {
      throw this.handleFileSystemError(error, projectPath, [
        'Ensure you have write permissions to the target directory',
        'Check that the path is valid and accessible',
        'Try creating the project in a different location'
      ])
    }
  }

  /**
   * Reads file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8')
    } catch (error) {
      throw this.handleFileSystemError(error, filePath, [
        'Check that the file exists',
        'Ensure you have read permissions',
        'Verify the file path is correct'
      ])
    }
  }

  /**
   * Writes content to a file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDirectory(dirname(filePath))
      await fs.writeFile(filePath, content, 'utf8')
    } catch (error) {
      throw this.handleFileSystemError(error, filePath, [
        'Ensure you have write permissions',
        'Check that the directory exists',
        'Verify the file path is valid'
      ])
    }
  }

  /**
   * Deletes a file or directory
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      if (stats.isDirectory()) {
        await fs.rmdir(filePath, { recursive: true })
      } else {
        await fs.unlink(filePath)
      }
    } catch (error) {
      throw this.handleFileSystemError(error, filePath, [
        'Ensure you have delete permissions',
        'Check that the file or directory exists',
        'Close any applications using the file'
      ])
    }
  }

  /**
   * Creates a directory if it doesn't exist
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      throw this.handleFileSystemError(error, dirPath, [
        'Ensure you have write permissions',
        'Check that the path is valid',
        'Verify parent directories are accessible'
      ])
    }
  }

  /**
   * Checks if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Gets file or directory stats
   */
  async getStats(filePath: string): Promise<FileMetadata> {
    try {
      const stats = await fs.stat(filePath)
      const name = basename(filePath)
      
      return {
        size: stats.size,
        modified: stats.mtime,
        extension: extname(filePath),
        isHidden: name.startsWith('.')
      }
    } catch (error) {
      throw this.handleFileSystemError(error, filePath, [
        'Check that the file exists',
        'Ensure you have read permissions'
      ])
    }
  }

  /**
   * Lists directory contents
   */
  async listDirectory(dirPath: string): Promise<FileNode[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const nodes: FileNode[] = []

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)
        const metadata = await this.getStats(fullPath)
        
        const node: FileNode = {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          metadata
        }

        if (entry.isDirectory()) {
          // Recursively get children for directories
          node.children = await this.listDirectory(fullPath)
        }

        nodes.push(node)
      }

      return nodes.sort((a, b) => {
        // Directories first, then files, both alphabetically
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
    } catch (error) {
      throw this.handleFileSystemError(error, dirPath, [
        'Check that the directory exists',
        'Ensure you have read permissions',
        'Verify the path is a directory'
      ])
    }
  }

  /**
   * Gets the complete project structure
   */
  async getProjectStructure(rootPath: string): Promise<ProjectStructure> {
    try {
      const files = await this.listDirectory(rootPath)
      const configuration = await this.loadProjectConfiguration(rootPath)
      const dependencies = await this.loadProjectDependencies(rootPath)
      
      return {
        name: basename(rootPath),
        path: rootPath,
        type: this.detectProjectType(files),
        files,
        configuration,
        dependencies
      }
    } catch (error) {
      throw this.handleFileSystemError(error, rootPath, [
        'Ensure the project directory exists',
        'Check that you have read permissions',
        'Verify this is a valid Solana project'
      ])
    }
  }

  /**
   * Watches files for changes
   */
  watchFiles(patterns: string[], rootPath: string): FileWatcher {
    const emitter = new EventEmitter() as FileWatcher
    const watcherKey = `${rootPath}:${patterns.join(',')}`

    try {
      // Close existing watcher if it exists
      if (this.watchers.has(watcherKey)) {
        this.watchers.get(watcherKey)?.close()
      }

      const watcher = watch(rootPath, { recursive: true }, (eventType, filename) => {
        if (filename && this.matchesPatterns(filename, patterns)) {
          emitter.emit('change', {
            type: eventType,
            path: join(rootPath, filename),
            filename
          })
        }
      })

      this.watchers.set(watcherKey, watcher)

      emitter.close = () => {
        watcher.close()
        this.watchers.delete(watcherKey)
      }

      return emitter
    } catch (error) {
      throw this.handleFileSystemError(error, rootPath, [
        'Check that the directory exists',
        'Ensure you have read permissions',
        'Verify the path is accessible'
      ])
    }
  }

  /**
   * Copies a file or directory
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      const stats = await fs.stat(sourcePath)
      
      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath)
      } else {
        await this.ensureDirectory(dirname(targetPath))
        await fs.copyFile(sourcePath, targetPath)
      }
    } catch (error) {
      throw this.handleFileSystemError(error, sourcePath, [
        'Ensure source file exists',
        'Check write permissions for target location',
        'Verify both paths are valid'
      ])
    }
  }

  /**
   * Moves/renames a file or directory
   */
  async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      await this.ensureDirectory(dirname(targetPath))
      await fs.rename(sourcePath, targetPath)
    } catch (error) {
      throw this.handleFileSystemError(error, sourcePath, [
        'Ensure source file exists',
        'Check write permissions for both locations',
        'Verify target location is accessible'
      ])
    }
  }

  /**
   * Cleanup method to close all watchers
   */
  cleanup(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
  }

  // Private helper methods

  private async copyDirectory(sourcePath: string, targetPath: string): Promise<void> {
    await this.ensureDirectory(targetPath)
    const entries = await fs.readdir(sourcePath, { withFileTypes: true })

    for (const entry of entries) {
      const sourceEntryPath = join(sourcePath, entry.name)
      const targetEntryPath = join(targetPath, entry.name)

      if (entry.isDirectory()) {
        await this.copyDirectory(sourceEntryPath, targetEntryPath)
      } else {
        await fs.copyFile(sourceEntryPath, targetEntryPath)
      }
    }
  }

  private matchesPatterns(filename: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Simple glob pattern matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'))
      return regex.test(filename)
    })
  }

  private detectProjectType(files: FileNode[]): 'anchor' | 'native' | 'token' {
    const hasAnchorToml = files.some(f => f.name === 'Anchor.toml')
    const hasCargoToml = files.some(f => f.name === 'Cargo.toml')
    
    if (hasAnchorToml) return 'anchor'
    if (hasCargoToml) return 'native'
    return 'token' // Default fallback
  }

  private async loadProjectConfiguration(rootPath: string): Promise<ProjectConfiguration> {
    const defaultConfig: ProjectConfiguration = {
      name: basename(rootPath),
      version: '1.0.0'
    }

    try {
      // Try to load Anchor.toml first
      const anchorTomlPath = join(rootPath, 'Anchor.toml')
      if (await this.exists(anchorTomlPath)) {
        const content = await this.readFile(anchorTomlPath)
        return this.parseAnchorToml(content, defaultConfig)
      }

      // Try to load Cargo.toml
      const cargoTomlPath = join(rootPath, 'Cargo.toml')
      if (await this.exists(cargoTomlPath)) {
        const content = await this.readFile(cargoTomlPath)
        return this.parseCargoToml(content, defaultConfig)
      }

      return defaultConfig
    } catch {
      return defaultConfig
    }
  }

  private async loadProjectDependencies(rootPath: string): Promise<Dependency[]> {
    try {
      const cargoTomlPath = join(rootPath, 'Cargo.toml')
      if (await this.exists(cargoTomlPath)) {
        const content = await this.readFile(cargoTomlPath)
        return this.parseCargoTomlDependencies(content)
      }
      return []
    } catch {
      return []
    }
  }

  private parseAnchorToml(content: string, defaultConfig: ProjectConfiguration): ProjectConfiguration {
    // Basic TOML parsing for Anchor.toml
    const lines = content.split('\n')
    const config = { ...defaultConfig }

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('anchor_version')) {
        const match = trimmed.match(/anchor_version\s*=\s*"([^"]+)"/)
        if (match) config.anchorVersion = match[1]
      }
      if (trimmed.startsWith('solana_version')) {
        const match = trimmed.match(/solana_version\s*=\s*"([^"]+)"/)
        if (match) config.solanaVersion = match[1]
      }
    }

    return config
  }

  private parseCargoToml(content: string, defaultConfig: ProjectConfiguration): ProjectConfiguration {
    // Basic TOML parsing for Cargo.toml
    const lines = content.split('\n')
    const config = { ...defaultConfig }
    let inPackageSection = false

    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed === '[package]') {
        inPackageSection = true
        continue
      }
      
      if (trimmed.startsWith('[') && trimmed !== '[package]') {
        inPackageSection = false
        continue
      }

      if (inPackageSection) {
        if (trimmed.startsWith('name')) {
          const match = trimmed.match(/name\s*=\s*"([^"]+)"/)
          if (match) config.name = match[1]
        }
        if (trimmed.startsWith('version')) {
          const match = trimmed.match(/version\s*=\s*"([^"]+)"/)
          if (match) config.version = match[1]
        }
      }
    }

    return config
  }

  private parseCargoTomlDependencies(content: string): Dependency[] {
    const dependencies: Dependency[] = []
    const lines = content.split('\n')
    let inDependenciesSection = false
    let inDevDependenciesSection = false

    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed === '[dependencies]') {
        inDependenciesSection = true
        inDevDependenciesSection = false
        continue
      }
      
      if (trimmed === '[dev-dependencies]') {
        inDependenciesSection = false
        inDevDependenciesSection = true
        continue
      }
      
      if (trimmed.startsWith('[') && !trimmed.includes('dependencies')) {
        inDependenciesSection = false
        inDevDependenciesSection = false
        continue
      }

      if ((inDependenciesSection || inDevDependenciesSection) && trimmed.includes('=')) {
        const match = trimmed.match(/^([^=]+)\s*=\s*"([^"]+)"/)
        if (match) {
          dependencies.push({
            name: match[1].trim(),
            version: match[2],
            type: inDevDependenciesSection ? 'dev' : 'runtime'
          })
        }
      }
    }

    return dependencies
  }

  private handleFileSystemError(error: any, path?: string, suggestedActions: string[] = []): FileSystemError {
    let message = 'File system operation failed'
    let code = 'UNKNOWN'

    if (error.code) {
      code = error.code
      switch (error.code) {
        case 'ENOENT':
          message = `File or directory not found: ${path}`
          break
        case 'EACCES':
          message = `Permission denied: ${path}`
          break
        case 'EEXIST':
          message = `File or directory already exists: ${path}`
          break
        case 'ENOTDIR':
          message = `Not a directory: ${path}`
          break
        case 'EISDIR':
          message = `Is a directory: ${path}`
          break
        case 'EMFILE':
          message = 'Too many open files'
          break
        case 'ENOSPC':
          message = 'No space left on device'
          break
        default:
          message = error.message || message
      }
    }

    return new FileSystemError(message, code, path, suggestedActions)
  }
}