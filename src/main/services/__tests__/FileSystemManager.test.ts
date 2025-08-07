import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fs } from 'fs'
import { join } from 'path'
import { FileSystemManager, FileSystemError, ProjectTemplate } from '../FileSystemManager'

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    copyFile: vi.fn(),
    rename: vi.fn()
  },
  watch: vi.fn()
}))

const mockFs = fs as any

describe('FileSystemManager', () => {
  let fileSystemManager: FileSystemManager
  const testPath = '/test/path'
  const testContent = 'test content'

  beforeEach(() => {
    fileSystemManager = new FileSystemManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    fileSystemManager.cleanup()
  })

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      mockFs.readFile.mockResolvedValue(testContent)

      const result = await fileSystemManager.readFile(testPath)

      expect(result).toBe(testContent)
      expect(mockFs.readFile).toHaveBeenCalledWith(testPath, 'utf8')
    })

    it('should throw FileSystemError when file does not exist', async () => {
      const error = new Error('File not found')
      error.code = 'ENOENT'
      mockFs.readFile.mockRejectedValue(error)

      await expect(fileSystemManager.readFile(testPath)).rejects.toThrow(FileSystemError)
    })

    it('should provide helpful error message for ENOENT', async () => {
      const error = new Error('File not found')
      error.code = 'ENOENT'
      mockFs.readFile.mockRejectedValue(error)

      try {
        await fileSystemManager.readFile(testPath)
      } catch (err) {
        expect(err).toBeInstanceOf(FileSystemError)
        expect(err.message).toContain('File or directory not found')
        expect(err.suggestedActions).toContain('Check that the file exists')
      }
    })
  })

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)

      await fileSystemManager.writeFile(testPath, testContent)

      expect(mockFs.writeFile).toHaveBeenCalledWith(testPath, testContent, 'utf8')
    })

    it('should create directory before writing file', async () => {
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)

      await fileSystemManager.writeFile('/test/nested/file.txt', testContent)

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/nested', { recursive: true })
    })

    it('should throw FileSystemError on permission denied', async () => {
      const error = new Error('Permission denied')
      error.code = 'EACCES'
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockRejectedValue(error)

      await expect(fileSystemManager.writeFile(testPath, testContent)).rejects.toThrow(FileSystemError)
    })
  })

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => false })
      mockFs.unlink.mockResolvedValue(undefined)

      await fileSystemManager.deleteFile(testPath)

      expect(mockFs.unlink).toHaveBeenCalledWith(testPath)
    })

    it('should delete a directory recursively', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true })
      mockFs.rmdir.mockResolvedValue(undefined)

      await fileSystemManager.deleteFile(testPath)

      expect(mockFs.rmdir).toHaveBeenCalledWith(testPath, { recursive: true })
    })
  })

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValue(undefined)

      const result = await fileSystemManager.exists(testPath)

      expect(result).toBe(true)
      expect(mockFs.access).toHaveBeenCalledWith(testPath)
    })

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'))

      const result = await fileSystemManager.exists(testPath)

      expect(result).toBe(false)
    })
  })

  describe('getStats', () => {
    it('should return file metadata', async () => {
      const mockStats = {
        size: 1024,
        mtime: new Date('2023-01-01'),
        isDirectory: () => false
      }
      mockFs.stat.mockResolvedValue(mockStats)

      const result = await fileSystemManager.getStats('/test/file.txt')

      expect(result).toEqual({
        size: 1024,
        modified: mockStats.mtime,
        extension: '.txt',
        isHidden: false
      })
    })

    it('should detect hidden files', async () => {
      const mockStats = {
        size: 512,
        mtime: new Date('2023-01-01'),
        isDirectory: () => false
      }
      mockFs.stat.mockResolvedValue(mockStats)

      const result = await fileSystemManager.getStats('/test/.hidden')

      expect(result.isHidden).toBe(true)
    })
  })

  describe('listDirectory', () => {
    it('should list directory contents', async () => {
      const mockEntries = [
        { name: 'file1.txt', isDirectory: () => false },
        { name: 'dir1', isDirectory: () => true }
      ]
      mockFs.readdir.mockResolvedValue(mockEntries)
      mockFs.stat.mockImplementation((path) => {
        if (path.includes('file1.txt')) {
          return Promise.resolve({
            size: 100,
            mtime: new Date('2023-01-01')
          })
        }
        return Promise.resolve({
          size: 0,
          mtime: new Date('2023-01-01')
        })
      })

      // Mock recursive call for directory
      mockFs.readdir.mockImplementation((path) => {
        if (path.includes('dir1')) {
          return Promise.resolve([])
        }
        return Promise.resolve(mockEntries)
      })

      const result = await fileSystemManager.listDirectory(testPath)

      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('directory') // Directories first
      expect(result[1].type).toBe('file')
    })
  })

  describe('createProject', () => {
    it('should create project from template', async () => {
      const template: ProjectTemplate = {
        name: 'test-project',
        type: 'anchor',
        directories: ['src', 'tests'],
        files: [
          { path: 'Cargo.toml', content: '[package]\nname = "test"' },
          { path: 'src/lib.rs', content: 'pub mod lib;' }
        ]
      }

      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.readdir.mockResolvedValue([])
      mockFs.access.mockRejectedValue(new Error('Not found'))

      const result = await fileSystemManager.createProject(template, testPath)

      expect(mockFs.mkdir).toHaveBeenCalledWith(testPath, { recursive: true })
      expect(mockFs.mkdir).toHaveBeenCalledWith(join(testPath, 'src'), { recursive: true })
      expect(mockFs.mkdir).toHaveBeenCalledWith(join(testPath, 'tests'), { recursive: true })
      expect(mockFs.writeFile).toHaveBeenCalledWith(join(testPath, 'Cargo.toml'), '[package]\nname = "test"', 'utf8')
      expect(mockFs.writeFile).toHaveBeenCalledWith(join(testPath, 'src/lib.rs'), 'pub mod lib;', 'utf8')
      expect(result.name).toBe('test-project')
      expect(result.type).toBe('anchor')
    })
  })

  describe('copyFile', () => {
    it('should copy a file', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => false })
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.copyFile.mockResolvedValue(undefined)

      await fileSystemManager.copyFile('/source/file.txt', '/target/file.txt')

      expect(mockFs.copyFile).toHaveBeenCalledWith('/source/file.txt', '/target/file.txt')
    })
  })

  describe('moveFile', () => {
    it('should move/rename a file', async () => {
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.rename.mockResolvedValue(undefined)

      await fileSystemManager.moveFile('/source/file.txt', '/target/file.txt')

      expect(mockFs.rename).toHaveBeenCalledWith('/source/file.txt', '/target/file.txt')
    })
  })

  describe('error handling', () => {
    it('should handle EACCES error with appropriate message', async () => {
      const error = new Error('Permission denied')
      error.code = 'EACCES'
      mockFs.readFile.mockRejectedValue(error)

      try {
        await fileSystemManager.readFile(testPath)
      } catch (err) {
        expect(err).toBeInstanceOf(FileSystemError)
        expect(err.message).toContain('Permission denied')
        expect(err.code).toBe('EACCES')
        expect(err.path).toBe(testPath)
      }
    })

    it('should handle EEXIST error', async () => {
      const error = new Error('File exists')
      error.code = 'EEXIST'
      mockFs.writeFile.mockRejectedValue(error)

      try {
        await fileSystemManager.writeFile(testPath, testContent)
      } catch (err) {
        expect(err).toBeInstanceOf(FileSystemError)
        expect(err.message).toContain('already exists')
      }
    })

    it('should handle ENOSPC error', async () => {
      const error = new Error('No space')
      error.code = 'ENOSPC'
      mockFs.writeFile.mockRejectedValue(error)

      try {
        await fileSystemManager.writeFile(testPath, testContent)
      } catch (err) {
        expect(err).toBeInstanceOf(FileSystemError)
        expect(err.message).toContain('No space left on device')
      }
    })
  })

  describe('project type detection', () => {
    it('should detect anchor project', async () => {
      const mockEntries = [
        { name: 'Anchor.toml', isDirectory: () => false },
        { name: 'Cargo.toml', isDirectory: () => false }
      ]
      mockFs.readdir.mockResolvedValue(mockEntries)
      mockFs.stat.mockResolvedValue({
        size: 100,
        mtime: new Date('2023-01-01')
      })
      mockFs.access.mockRejectedValue(new Error('Not found'))

      const result = await fileSystemManager.getProjectStructure(testPath)

      expect(result.type).toBe('anchor')
    })

    it('should detect native project', async () => {
      const mockEntries = [
        { name: 'Cargo.toml', isDirectory: () => false }
      ]
      mockFs.readdir.mockResolvedValue(mockEntries)
      mockFs.stat.mockResolvedValue({
        size: 100,
        mtime: new Date('2023-01-01')
      })
      mockFs.access.mockRejectedValue(new Error('Not found'))

      const result = await fileSystemManager.getProjectStructure(testPath)

      expect(result.type).toBe('native')
    })
  })
})