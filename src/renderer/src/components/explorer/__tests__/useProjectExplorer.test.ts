import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useProjectExplorer from '../useProjectExplorer'

// Mock window.electron
const mockElectron = {
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn()
  }
}

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true
})

describe('useProjectExplorer', () => {
  beforeEach(() => {
    mockElectron.ipcRenderer.invoke.mockClear()
    mockElectron.ipcRenderer.send.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useProjectExplorer())
    const [state] = result.current

    expect(state).toEqual({
      files: [],
      selectedFiles: [],
      projectPath: null,
      isLoading: false,
      error: null
    })
  })

  it('loads project successfully', async () => {
    const mockFiles = [
      {
        name: 'src',
        path: '/project/src',
        type: 'directory',
        children: [
          {
            name: 'lib.rs',
            path: '/project/src/lib.rs',
            type: 'file',
            metadata: { size: 1024, modified: new Date() }
          }
        ]
      }
    ]

    mockElectron.ipcRenderer.invoke.mockResolvedValue(mockFiles)

    const { result } = renderHook(() => useProjectExplorer())

    await act(async () => {
      const [, actions] = result.current
      await actions.loadProject('/project')
    })

    const [state] = result.current
    expect(state.files).toEqual(mockFiles)
    expect(state.projectPath).toBe('/project')
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('fs:get-project-structure', {
      path: '/project'
    })
  })

  it('handles load project error', async () => {
    const error = new Error('Failed to load project')
    mockElectron.ipcRenderer.invoke.mockRejectedValue(error)

    const { result } = renderHook(() => useProjectExplorer())

    await act(async () => {
      const [, actions] = result.current
      await actions.loadProject('/project')
    })

    const [state] = result.current
    expect(state.files).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBe('Failed to load project')
  })

  it('uses fallback mock data when electron is not available', async () => {
    // Temporarily remove electron
    const originalElectron = window.electron
    delete (window as any).electron

    const { result } = renderHook(() => useProjectExplorer())

    await act(async () => {
      const [, actions] = result.current
      await actions.loadProject('/project')
    })

    const [state] = result.current
    expect(state.files).toHaveLength(4) // Mock data has 4 items
    expect(state.files[0].name).toBe('src')
    expect(state.projectPath).toBe('/project')

    // Restore electron
    ;(window as any).electron = originalElectron
  })

  it('refreshes project', async () => {
    const mockFiles = [{ name: 'test.rs', path: '/project/test.rs', type: 'file' as const }]
    mockElectron.ipcRenderer.invoke.mockResolvedValue(mockFiles)

    const { result } = renderHook(() => useProjectExplorer())

    // Load project first
    await act(async () => {
      const [, actions] = result.current
      await actions.loadProject('/project')
    })

    // Clear mock calls
    mockElectron.ipcRenderer.invoke.mockClear()

    // Refresh project
    await act(async () => {
      const [, actions] = result.current
      await actions.refreshProject()
    })

    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('fs:get-project-structure', {
      path: '/project'
    })
  })

  it('selects single file', () => {
    const { result } = renderHook(() => useProjectExplorer())

    act(() => {
      const [, actions] = result.current
      actions.selectFile('/project/test.rs')
    })

    const [state] = result.current
    expect(state.selectedFiles).toEqual(['/project/test.rs'])
  })

  it('handles multi-select', () => {
    const { result } = renderHook(() => useProjectExplorer())

    act(() => {
      const [, actions] = result.current
      actions.selectFile('/project/test1.rs')
      actions.selectFile('/project/test2.rs', true) // Multi-select
    })

    const [state] = result.current
    expect(state.selectedFiles).toEqual(['/project/test1.rs', '/project/test2.rs'])
  })

  it('deselects file in multi-select mode', () => {
    const { result } = renderHook(() => useProjectExplorer())

    act(() => {
      const [, actions] = result.current
      actions.selectFile('/project/test1.rs')
      actions.selectFile('/project/test2.rs', true)
      actions.selectFile('/project/test1.rs', true) // Deselect
    })

    const [state] = result.current
    expect(state.selectedFiles).toEqual(['/project/test2.rs'])
  })

  it('opens file and sends IPC message', () => {
    const { result } = renderHook(() => useProjectExplorer())

    act(() => {
      const [, actions] = result.current
      actions.openFile('/project/test.rs')
    })

    expect(mockElectron.ipcRenderer.send).toHaveBeenCalledWith('editor:open-file', {
      path: '/project/test.rs'
    })

    const [state] = result.current
    expect(state.selectedFiles).toEqual(['/project/test.rs'])
  })

  it('creates file successfully', async () => {
    mockElectron.ipcRenderer.invoke
      .mockResolvedValueOnce(undefined) // create-file
      .mockResolvedValueOnce([]) // refresh project structure

    const { result } = renderHook(() => useProjectExplorer())

    // Set up project first
    act(() => {
      result.current[0] = { ...result.current[0], projectPath: '/project' }
    })

    await act(async () => {
      const [, actions] = result.current
      await actions.createFile('/project/src', 'new-file.rs', 'file')
    })

    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('fs:create-file', {
      parentPath: '/project/src',
      name: 'new-file.rs',
      type: 'file'
    })
  })

  it('handles create file error', async () => {
    const error = new Error('Permission denied')
    mockElectron.ipcRenderer.invoke.mockRejectedValue(error)

    const { result } = renderHook(() => useProjectExplorer())

    await act(async () => {
      const [, actions] = result.current
      try {
        await actions.createFile('/project/src', 'new-file.rs', 'file')
      } catch (e) {
        // Expected to throw
      }
    })

    const [state] = result.current
    expect(state.error).toBe('Permission denied')
  })

  it('deletes file successfully', async () => {
    mockElectron.ipcRenderer.invoke
      .mockResolvedValueOnce(undefined) // delete-file
      .mockResolvedValueOnce([]) // refresh project structure

    const { result } = renderHook(() => useProjectExplorer())

    // Set up project and selection
    act(() => {
      result.current[0] = {
        ...result.current[0],
        projectPath: '/project',
        selectedFiles: ['/project/test.rs']
      }
    })

    await act(async () => {
      const [, actions] = result.current
      await actions.deleteFile('/project/test.rs')
    })

    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('fs:delete-file', {
      path: '/project/test.rs'
    })

    const [state] = result.current
    expect(state.selectedFiles).toEqual([]) // Should be removed from selection
  })

  it('renames file successfully', async () => {
    mockElectron.ipcRenderer.invoke
      .mockResolvedValueOnce(undefined) // rename-file
      .mockResolvedValueOnce([]) // refresh project structure

    const { result } = renderHook(() => useProjectExplorer())

    // Set up project and selection
    act(() => {
      result.current[0] = {
        ...result.current[0],
        projectPath: '/project',
        selectedFiles: ['/project/old-name.rs']
      }
    })

    await act(async () => {
      const [, actions] = result.current
      await actions.renameFile('/project/old-name.rs', 'new-name.rs')
    })

    expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith('fs:rename-file', {
      oldPath: '/project/old-name.rs',
      newPath: '/project/new-name.rs'
    })

    const [state] = result.current
    expect(state.selectedFiles).toEqual(['/project/new-name.rs']) // Should update selection
  })

  it('clears selection', () => {
    const { result } = renderHook(() => useProjectExplorer())

    act(() => {
      const [, actions] = result.current
      actions.selectFile('/project/test1.rs')
      actions.selectFile('/project/test2.rs', true)
      actions.clearSelection()
    })

    const [state] = result.current
    expect(state.selectedFiles).toEqual([])
  })

  it('handles operations without electron IPC', async () => {
    // Temporarily remove electron
    const originalElectron = window.electron
    delete (window as any).electron

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { result } = renderHook(() => useProjectExplorer())

    await act(async () => {
      const [, actions] = result.current
      await actions.createFile('/project/src', 'test.rs', 'file')
    })

    expect(consoleSpy).toHaveBeenCalledWith('Creating file: /project/src/test.rs')

    await act(async () => {
      const [, actions] = result.current
      await actions.deleteFile('/project/test.rs')
    })

    expect(consoleSpy).toHaveBeenCalledWith('Deleting: /project/test.rs')

    await act(async () => {
      const [, actions] = result.current
      await actions.renameFile('/project/old.rs', 'new.rs')
    })

    expect(consoleSpy).toHaveBeenCalledWith('Renaming: /project/old.rs -> /project/new.rs')

    consoleSpy.mockRestore()
    // Restore electron
    ;(window as any).electron = originalElectron
  })

  it('handles loading state correctly', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise(resolve => {
      resolvePromise = resolve
    })

    mockElectron.ipcRenderer.invoke.mockReturnValue(promise)

    const { result } = renderHook(() => useProjectExplorer())

    // Start loading
    act(() => {
      const [, actions] = result.current
      actions.loadProject('/project')
    })

    // Should be loading
    expect(result.current[0].isLoading).toBe(true)

    // Resolve the promise
    await act(async () => {
      resolvePromise!([])
      await promise
    })

    // Should no longer be loading
    expect(result.current[0].isLoading).toBe(false)
  })
})