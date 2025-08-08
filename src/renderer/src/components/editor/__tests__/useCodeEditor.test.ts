import { renderHook, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCodeEditor } from '../useCodeEditor'
import { Diagnostic } from '@shared/types/Common'

// Mock the window.api
const mockAPI = {
  fileSystem: {
    readFile: vi.fn(),
    writeFile: vi.fn()
  }
}

// @ts-ignore
global.window = {
  api: mockAPI
}

describe('useCodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('initializes with default values', () => {
    const { result } = renderHook(() => useCodeEditor())

    expect(result.current.content).toBe('')
    expect(result.current.isDirty).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.diagnostics).toEqual([])
    expect(result.current.cursorPosition).toBeNull()
  })

  it('loads file content correctly', async () => {
    const mockContent = 'fn main() { println!("Hello, world!"); }'
    mockAPI.fileSystem.readFile.mockResolvedValue({
      content: mockContent,
      encoding: 'utf8'
    })

    const { result } = renderHook(() => useCodeEditor())

    await act(async () => {
      await result.current.loadFile('/path/to/test.rs')
    })

    expect(mockAPI.fileSystem.readFile).toHaveBeenCalledWith('/path/to/test.rs')
    expect(result.current.content).toBe(mockContent)
    expect(result.current.isDirty).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('handles file loading errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockAPI.fileSystem.readFile.mockRejectedValue(new Error('File not found'))

    const { result } = renderHook(() => useCodeEditor())

    await act(async () => {
      await result.current.loadFile('/path/to/nonexistent.rs')
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load file:', expect.any(Error))
    expect(result.current.isLoading).toBe(false)
    
    consoleErrorSpy.mockRestore()
  })

  it('saves file content correctly', async () => {
    mockAPI.fileSystem.writeFile.mockResolvedValue({ bytesWritten: 100 })
    mockAPI.fileSystem.readFile.mockResolvedValue({
      content: 'initial content',
      encoding: 'utf8'
    })

    const { result } = renderHook(() => useCodeEditor())

    // First load a file
    await act(async () => {
      await result.current.loadFile('/path/to/test.rs')
    })

    // Then modify content
    act(() => {
      result.current.setContent('modified content')
    })

    expect(result.current.isDirty).toBe(true)

    // Mock the editor ref to return the modified content
    const mockEditorRef = {
      getContent: () => 'modified content'
    }
    // @ts-ignore
    result.current.editorRef.current = mockEditorRef

    // Save the file
    await act(async () => {
      await result.current.saveFile()
    })

    expect(mockAPI.fileSystem.writeFile).toHaveBeenCalledWith('/path/to/test.rs', 'modified content')
    expect(result.current.isDirty).toBe(false)
  })

  it('handles file saving errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockAPI.fileSystem.readFile.mockResolvedValue({
      content: 'initial content',
      encoding: 'utf8'
    })
    mockAPI.fileSystem.writeFile.mockRejectedValue(new Error('Permission denied'))

    const { result } = renderHook(() => useCodeEditor())

    // Load a file and modify it
    await act(async () => {
      await result.current.loadFile('/path/to/test.rs')
    })

    act(() => {
      result.current.setContent('modified content')
    })

    // Try to save
    await act(async () => {
      await result.current.saveFile()
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save file:', expect.any(Error))
    expect(result.current.isDirty).toBe(true) // Should remain dirty on save failure
    
    consoleErrorSpy.mockRestore()
  })

  it('tracks dirty state correctly', async () => {
    mockAPI.fileSystem.readFile.mockResolvedValue({
      content: 'original content',
      encoding: 'utf8'
    })

    const { result } = renderHook(() => useCodeEditor())

    // Load file
    await act(async () => {
      await result.current.loadFile('/path/to/test.rs')
    })

    expect(result.current.isDirty).toBe(false)

    // Modify content
    act(() => {
      result.current.setContent('modified content')
    })

    expect(result.current.isDirty).toBe(true)

    // Set back to original content
    act(() => {
      result.current.setContent('original content')
    })

    expect(result.current.isDirty).toBe(false)
  })

  it('manages diagnostics correctly', () => {
    const { result } = renderHook(() => useCodeEditor())

    const diagnostics: Diagnostic[] = [
      {
        range: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 10 }
        },
        message: 'Test error',
        severity: 'error'
      }
    ]

    act(() => {
      result.current.addDiagnostics(diagnostics)
    })

    expect(result.current.diagnostics).toEqual(diagnostics)

    act(() => {
      result.current.clearDiagnostics()
    })

    expect(result.current.diagnostics).toEqual([])
  })

  it('determines language from file path correctly', () => {
    const { result } = renderHook(() => useCodeEditor())

    expect(result.current.getLanguageFromFilePath('test.rs')).toBe('rust')
    expect(result.current.getLanguageFromFilePath('Cargo.toml')).toBe('toml')
    expect(result.current.getLanguageFromFilePath('package.json')).toBe('json')
    expect(result.current.getLanguageFromFilePath('README.md')).toBe('markdown')
    expect(result.current.getLanguageFromFilePath('script.ts')).toBe('typescript')
    expect(result.current.getLanguageFromFilePath('script.js')).toBe('javascript')
    expect(result.current.getLanguageFromFilePath('unknown.xyz')).toBe('plaintext')
  })

  it('handles auto-save functionality', async () => {
    vi.useFakeTimers()
    
    mockAPI.fileSystem.readFile.mockResolvedValue({
      content: 'initial content',
      encoding: 'utf8'
    })
    mockAPI.fileSystem.writeFile.mockResolvedValue({ bytesWritten: 100 })

    const { result } = renderHook(() => 
      useCodeEditor({ autoSave: true, autoSaveDelay: 1000 })
    )

    // Load file
    await act(async () => {
      await result.current.loadFile('/path/to/test.rs')
    })

    // Modify content
    act(() => {
      result.current.setContent('modified content')
    })

    expect(result.current.isDirty).toBe(true)

    // Fast-forward time to trigger auto-save
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()
    })

    expect(mockAPI.fileSystem.writeFile).toHaveBeenCalledWith('/path/to/test.rs', 'modified content')
    
    vi.useRealTimers()
  })

  it('loads initial file if provided in options', async () => {
    mockAPI.fileSystem.readFile.mockResolvedValue({
      content: 'file content',
      encoding: 'utf8'
    })

    renderHook(() => useCodeEditor({ filePath: '/path/to/initial.rs' }))

    await waitFor(() => {
      expect(mockAPI.fileSystem.readFile).toHaveBeenCalledWith('/path/to/initial.rs')
    })
  })
})