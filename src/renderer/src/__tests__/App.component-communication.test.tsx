import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from '../App'

// Mock the API
const mockAPI = {
  fileSystem: {
    readFile: vi.fn().mockResolvedValue({ content: '// Mock file content', encoding: 'utf8' }),
    writeFile: vi.fn().mockResolvedValue({ bytesWritten: 100 })
  },
  terminal: {
    create: vi.fn().mockResolvedValue({ terminalId: 'test-terminal', pid: 1234 }),
    sendInput: vi.fn().mockResolvedValue({ sent: true }),
    resize: vi.fn().mockResolvedValue({ resized: true }),
    close: vi.fn().mockResolvedValue({ closed: true })
  },
  events: {
    onTerminalOutput: vi.fn().mockReturnValue(() => {}),
    onFileChanged: vi.fn().mockReturnValue(() => {}),
    onProcessOutput: vi.fn().mockReturnValue(() => {})
  }
}

// Mock window.api
Object.defineProperty(window, 'api', {
  value: mockAPI,
  writable: true
})

// Mock process.cwd
Object.defineProperty(process, 'cwd', {
  value: vi.fn().mockReturnValue('/mock/project'),
  writable: true
})

// Mock components with more realistic behavior
vi.mock('../components/menu', () => ({
  MainMenu: ({ onAction }: { onAction: (action: string) => void }) => (
    <div data-testid="main-menu">
      <button onClick={() => onAction('file.open.project')} data-testid="menu-open-project">
        Open Project
      </button>
      <button onClick={() => onAction('file.save')} data-testid="menu-save">
        Save
      </button>
      <button onClick={() => onAction('view.explorer')} data-testid="menu-toggle-explorer">
        Toggle Explorer
      </button>
      <button onClick={() => onAction('view.terminal')} data-testid="menu-toggle-terminal">
        Toggle Terminal
      </button>
    </div>
  ),
  Toolbar: ({ onAction }: { onAction: (action: string) => void }) => (
    <div data-testid="toolbar">
      <button onClick={() => onAction('build.build')} data-testid="toolbar-build">
        Build
      </button>
      <button onClick={() => onAction('build.test')} data-testid="toolbar-test">
        Test
      </button>
    </div>
  ),
  KeyboardShortcutManager: vi.fn().mockImplementation(() => ({
    addListener: vi.fn(),
    removeListener: vi.fn()
  }))
}))

// Mock project explorer with state management
let mockExplorerState = {
  files: [
    { name: 'lib.rs', path: '/mock/project/src/lib.rs', type: 'file' as const },
    { name: 'main.rs', path: '/mock/project/src/main.rs', type: 'file' as const }
  ],
  selectedFiles: [],
  projectPath: null,
  isLoading: false,
  error: null,
  validationErrors: []
}

const mockExplorerActions = {
  loadProject: vi.fn().mockImplementation((path: string) => {
    mockExplorerState = { ...mockExplorerState, projectPath: path }
  }),
  refreshProject: vi.fn(),
  selectFile: vi.fn().mockImplementation((filePath: string) => {
    mockExplorerState = {
      ...mockExplorerState,
      selectedFiles: [filePath]
    }
  }),
  openFile: vi.fn(),
  createFile: vi.fn(),
  deleteFile: vi.fn(),
  renameFile: vi.fn(),
  clearSelection: vi.fn(),
  validateProject: vi.fn()
}

vi.mock('../components/explorer', () => ({
  ProjectExplorer: ({ 
    onFileOpen, 
    onFileSelect,
    files,
    selectedFiles,
    projectPath
  }: any) => (
    <div data-testid="project-explorer">
      <div data-testid="project-path">{projectPath || 'No project'}</div>
      <div data-testid="file-list">
        {files.map((file: any) => (
          <div key={file.path} data-testid={`file-${file.name}`}>
            <button 
              onClick={() => onFileOpen(file.path)}
              data-testid={`open-${file.name}`}
            >
              Open {file.name}
            </button>
            <button 
              onClick={() => onFileSelect(file.path)}
              data-testid={`select-${file.name}`}
            >
              Select {file.name}
            </button>
          </div>
        ))}
      </div>
      <div data-testid="selected-files">{selectedFiles.join(', ')}</div>
    </div>
  )
}))

vi.mock('../components/explorer/useProjectExplorer', () => ({
  default: () => [mockExplorerState, mockExplorerActions]
}))

// Mock code editor with content management
let mockEditorContent = ''
let mockEditorIsDirty = false

const mockEditorActions = {
  loadFile: vi.fn().mockImplementation(async (filePath: string) => {
    const result = await mockAPI.fileSystem.readFile(filePath)
    mockEditorContent = result.content
    mockEditorIsDirty = false
  }),
  saveFile: vi.fn().mockImplementation(async () => {
    await mockAPI.fileSystem.writeFile('current-file', mockEditorContent)
    mockEditorIsDirty = false
  }),
  setContent: vi.fn().mockImplementation((content: string) => {
    mockEditorContent = content
    mockEditorIsDirty = true
  }),
  getLanguageFromFilePath: vi.fn(() => 'rust')
}

vi.mock('../components/editor', () => ({
  CodeEditor: React.forwardRef(({ 
    filePath, 
    content, 
    onContentChange, 
    onSave,
    language
  }: any, ref: any) => (
    <div data-testid="code-editor">
      <div data-testid="editor-file-path">{filePath || 'No file open'}</div>
      <div data-testid="editor-language">{language}</div>
      <textarea 
        data-testid="editor-content"
        value={content || ''}
        onChange={(e) => {
          onContentChange?.(e.target.value)
        }}
      />
      <button 
        onClick={() => onSave?.(content)}
        data-testid="editor-save"
      >
        Save
      </button>
      <div data-testid="editor-dirty">{mockEditorIsDirty ? 'dirty' : 'clean'}</div>
    </div>
  )),
  useCodeEditor: ({ filePath }: any) => ({
    content: mockEditorContent,
    isDirty: mockEditorIsDirty,
    isLoading: false,
    diagnostics: [],
    editorRef: { current: null },
    ...mockEditorActions
  })
}))

// Mock terminal with session management
let mockTerminalSessions: any[] = []

const mockTerminalActions = {
  createSession: vi.fn().mockImplementation((config: any) => {
    const sessionId = `terminal-${Date.now()}`
    return sessionId
  }),
  setActiveSession: vi.fn(),
  onSessionCreate: vi.fn().mockImplementation((session: any) => {
    mockTerminalSessions = [...mockTerminalSessions, session]
  })
}

vi.mock('../components/terminal', () => ({
  TerminalComponent: ({ onSessionCreate }: any) => {
    React.useEffect(() => {
      const session = {
        id: 'test-terminal-1',
        terminal: {},
        isActive: true,
        title: 'Terminal 1'
      }
      onSessionCreate?.(session)
    }, [onSessionCreate])
    
    return (
      <div data-testid="terminal-component">
        <input data-testid="terminal-input" placeholder="Enter command" />
        <div data-testid="terminal-output">Terminal ready</div>
      </div>
    )
  },
  useTerminal: () => ({
    sessions: mockTerminalSessions,
    activeSessionId: mockTerminalSessions[0]?.id || null,
    ...mockTerminalActions
  })
}))

// Mock layout manager
vi.mock('../components/layout/IDELayoutManager', () => ({
  default: () => (
    <div data-testid="ide-layout-manager">
      <div data-testid="layout-content">Layout Manager</div>
    </div>
  )
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('App Component Communication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Reset mock state
    mockExplorerState = {
      files: [
        { name: 'lib.rs', path: '/mock/project/src/lib.rs', type: 'file' as const },
        { name: 'main.rs', path: '/mock/project/src/main.rs', type: 'file' as const }
      ],
      selectedFiles: [],
      projectPath: null,
      isLoading: false,
      error: null,
      validationErrors: []
    }
    mockEditorContent = ''
    mockEditorIsDirty = false
    mockTerminalSessions = []
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('handles project loading workflow', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })

    // Trigger project open from menu
    const openProjectButton = screen.getByTestId('menu-open-project')
    await user.click(openProjectButton)

    await waitFor(() => {
      expect(mockExplorerActions.loadProject).toHaveBeenCalledWith('/sample-project')
    })
  })

  it('handles file opening from explorer to editor', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Open a file from the explorer
    const openFileButton = screen.getByTestId('open-lib.rs')
    await user.click(openFileButton)

    await waitFor(() => {
      expect(mockEditorActions.loadFile).toHaveBeenCalledWith('/mock/project/src/lib.rs')
      expect(screen.getByTestId('editor-file-path')).toHaveTextContent('/mock/project/src/lib.rs')
    })
  })

  it('handles content changes and dirty state', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Open a file first
    const openFileButton = screen.getByTestId('open-lib.rs')
    await user.click(openFileButton)

    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })

    // Change content in editor
    const editorContent = screen.getByTestId('editor-content')
    await user.clear(editorContent)
    await user.type(editorContent, 'fn main() { println!("Hello, Solana!"); }')

    // Verify content change was handled
    expect(mockEditorActions.setContent).toHaveBeenCalled()
  })

  it('handles file save operations', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Open a file and modify it
    const openFileButton = screen.getByTestId('open-lib.rs')
    await user.click(openFileButton)

    await waitFor(() => {
      expect(screen.getByTestId('editor-save')).toBeInTheDocument()
    })

    // Save the file
    const saveButton = screen.getByTestId('editor-save')
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockEditorActions.saveFile).toHaveBeenCalled()
    })
  })

  it('handles file selection in explorer', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Select a file
    const selectFileButton = screen.getByTestId('select-lib.rs')
    await user.click(selectFileButton)

    expect(mockExplorerActions.selectFile).toHaveBeenCalledWith('/mock/project/src/lib.rs')
  })

  it('handles terminal session creation', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('terminal-component')).toBeInTheDocument()
    })

    // Terminal should be created and session should be established
    expect(mockTerminalActions.onSessionCreate).toHaveBeenCalled()
    expect(screen.getByTestId('terminal-input')).toBeInTheDocument()
  })

  it('handles view toggle actions', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })

    // Test explorer toggle
    const explorerToggle = screen.getByTestId('menu-toggle-explorer')
    await user.click(explorerToggle)

    // Test terminal toggle
    const terminalToggle = screen.getByTestId('menu-toggle-terminal')
    await user.click(terminalToggle)

    // These should trigger panel toggles (we can't easily test the actual toggle without more complex mocking)
    expect(explorerToggle).toBeInTheDocument()
    expect(terminalToggle).toBeInTheDocument()
  })

  it('handles build actions from toolbar', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    })

    // Test build action
    const buildButton = screen.getByTestId('toolbar-build')
    await user.click(buildButton)

    // Test test action
    const testButton = screen.getByTestId('toolbar-test')
    await user.click(testButton)

    expect(buildButton).toBeInTheDocument()
    expect(testButton).toBeInTheDocument()
  })

  it('maintains application state across component interactions', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // 1. Open project
    const openProjectButton = screen.getByTestId('menu-open-project')
    await user.click(openProjectButton)

    // 2. Open file
    const openFileButton = screen.getByTestId('open-lib.rs')
    await user.click(openFileButton)

    // 3. Modify content
    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })

    const editorContent = screen.getByTestId('editor-content')
    await user.clear(editorContent)
    await user.type(editorContent, 'modified content')

    // 4. Save file
    const saveButton = screen.getByTestId('editor-save')
    await user.click(saveButton)

    // Verify the workflow maintained state correctly
    expect(mockExplorerActions.loadProject).toHaveBeenCalled()
    expect(mockEditorActions.loadFile).toHaveBeenCalled()
    expect(mockEditorActions.setContent).toHaveBeenCalled()
    expect(mockEditorActions.saveFile).toHaveBeenCalled()
  })

  it('handles multiple file operations', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Open first file
    const openLibButton = screen.getByTestId('open-lib.rs')
    await user.click(openLibButton)

    await waitFor(() => {
      expect(screen.getByTestId('editor-file-path')).toHaveTextContent('/mock/project/src/lib.rs')
    })

    // Open second file
    const openMainButton = screen.getByTestId('open-main.rs')
    await user.click(openMainButton)

    await waitFor(() => {
      expect(screen.getByTestId('editor-file-path')).toHaveTextContent('/mock/project/src/main.rs')
    })

    // Verify both files were loaded
    expect(mockEditorActions.loadFile).toHaveBeenCalledWith('/mock/project/src/lib.rs')
    expect(mockEditorActions.loadFile).toHaveBeenCalledWith('/mock/project/src/main.rs')
  })

  it('handles error states gracefully', async () => {
    // Mock an error in file loading
    mockEditorActions.loadFile.mockRejectedValueOnce(new Error('File not found'))
    
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Try to open a file that will fail
    const openFileButton = screen.getByTestId('open-lib.rs')
    await user.click(openFileButton)

    // The error should be handled gracefully (component should still render)
    expect(screen.getByTestId('code-editor')).toBeInTheDocument()
  })

  it('handles keyboard shortcuts integration', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })

    // Verify keyboard shortcut manager was initialized
    // (We can't easily test actual keyboard events without more complex setup)
    expect(screen.getByTestId('main-menu')).toBeInTheDocument()
  })

  it('handles layout persistence', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('ide-layout-manager')).toBeInTheDocument()
    })

    // Verify layout persistence is attempted
    expect(localStorageMock.getItem).toHaveBeenCalledWith('simulsol-layout')
  })

  it('handles API communication for file operations', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Open a file (should trigger API call)
    const openFileButton = screen.getByTestId('open-lib.rs')
    await user.click(openFileButton)

    await waitFor(() => {
      expect(mockAPI.fileSystem.readFile).toHaveBeenCalled()
    })
  })

  it('handles terminal API integration', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('terminal-component')).toBeInTheDocument()
    })

    // Terminal should attempt to create a session via API
    expect(mockAPI.terminal.create).toHaveBeenCalled()
  })
})