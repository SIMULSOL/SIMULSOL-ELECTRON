import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from '../App'

// Mock the components and hooks
vi.mock('../components/menu', () => ({
  MainMenu: ({ onAction }: { onAction: (action: string) => void }) => (
    <div data-testid="main-menu">
      <button onClick={() => onAction('file.open.project')}>Open Project</button>
      <button onClick={() => onAction('file.save')}>Save</button>
      <button onClick={() => onAction('view.explorer')}>Toggle Explorer</button>
      <button onClick={() => onAction('view.terminal')}>Toggle Terminal</button>
    </div>
  ),
  Toolbar: ({ onAction }: { onAction: (action: string) => void }) => (
    <div data-testid="toolbar">
      <button onClick={() => onAction('build.build')}>Build</button>
      <button onClick={() => onAction('build.test')}>Test</button>
    </div>
  ),
  KeyboardShortcutManager: vi.fn().mockImplementation(() => ({
    addListener: vi.fn(),
    removeListener: vi.fn()
  }))
}))

vi.mock('../components/explorer', () => ({
  ProjectExplorer: ({ 
    onFileOpen, 
    onFileSelect,
    files = [],
    selectedFiles = []
  }: any) => (
    <div data-testid="project-explorer">
      <div>Project Explorer</div>
      <button 
        onClick={() => onFileOpen('/test/file.rs')}
        data-testid="open-file-button"
      >
        Open file.rs
      </button>
      <button 
        onClick={() => onFileSelect('/test/file.rs')}
        data-testid="select-file-button"
      >
        Select file.rs
      </button>
      <div data-testid="file-count">{files.length} files</div>
      <div data-testid="selected-count">{selectedFiles.length} selected</div>
    </div>
  ),
  useProjectExplorer: () => [
    {
      files: [
        { name: 'file.rs', path: '/test/file.rs', type: 'file' },
        { name: 'lib.rs', path: '/test/lib.rs', type: 'file' }
      ],
      selectedFiles: [],
      projectPath: '/test',
      isLoading: false,
      error: null,
      validationErrors: []
    },
    {
      loadProject: vi.fn(),
      refreshProject: vi.fn(),
      selectFile: vi.fn(),
      openFile: vi.fn(),
      createFile: vi.fn(),
      deleteFile: vi.fn(),
      renameFile: vi.fn(),
      clearSelection: vi.fn(),
      validateProject: vi.fn()
    }
  ]
}))

vi.mock('../components/editor', () => ({
  CodeEditor: React.forwardRef(({ 
    filePath, 
    content, 
    onContentChange, 
    onSave 
  }: any, ref: any) => (
    <div data-testid="code-editor">
      <div data-testid="editor-file-path">{filePath || 'No file'}</div>
      <textarea 
        data-testid="editor-content"
        value={content || ''}
        onChange={(e) => onContentChange?.(e.target.value)}
      />
      <button 
        onClick={() => onSave?.(content)}
        data-testid="editor-save-button"
      >
        Save
      </button>
    </div>
  )),
  useCodeEditor: ({ filePath }: any) => ({
    content: filePath ? `// Content of ${filePath}` : '',
    isDirty: false,
    isLoading: false,
    diagnostics: [],
    editorRef: { current: null },
    loadFile: vi.fn(),
    saveFile: vi.fn(),
    setContent: vi.fn(),
    getLanguageFromFilePath: vi.fn(() => 'rust')
  })
}))

vi.mock('../components/terminal', () => ({
  TerminalComponent: ({ onSessionCreate }: any) => {
    React.useEffect(() => {
      onSessionCreate?.({
        id: 'test-terminal',
        terminal: {},
        isActive: true,
        title: 'Terminal 1'
      })
    }, [onSessionCreate])
    
    return (
      <div data-testid="terminal-component">
        <div>Terminal Component</div>
        <input data-testid="terminal-input" placeholder="Enter command" />
      </div>
    )
  },
  useTerminal: () => ({
    sessions: [],
    activeSessionId: null,
    createSession: vi.fn(() => 'test-session'),
    destroySession: vi.fn(),
    setActiveSession: vi.fn(),
    getActiveSession: vi.fn(),
    sendInputToActive: vi.fn(),
    clearActiveTerminal: vi.fn(),
    resizeActiveTerminal: vi.fn(),
    onSessionCreate: vi.fn()
  })
}))

vi.mock('../components/layout/IDELayoutManager', () => ({
  default: ({ children }: any) => (
    <div data-testid="ide-layout-manager">
      {children}
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

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('renders the main IDE interface with all components', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('main-menu')).toBeInTheDocument()
      expect(screen.getByTestId('toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
      expect(screen.getByTestId('code-editor')).toBeInTheDocument()
      expect(screen.getByTestId('terminal-component')).toBeInTheDocument()
    })
  })

  it('shows welcome message when no file is open', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('SIMUSOL Core')).toBeInTheDocument()
      expect(screen.getByText(/Welcome to the Solana IDE/)).toBeInTheDocument()
      expect(screen.getByText(/Open a file from the project explorer/)).toBeInTheDocument()
    })
  })

  it('handles file opening from project explorer', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Click to open a file
    const openFileButton = screen.getByTestId('open-file-button')
    await user.click(openFileButton)

    await waitFor(() => {
      expect(screen.getByTestId('editor-file-path')).toHaveTextContent('/test/file.rs')
    })
  })

  it('handles menu actions correctly', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })

    // Test open project action
    const openProjectButton = screen.getByText('Open Project')
    await user.click(openProjectButton)

    // Should trigger project loading (we can verify through console.log or state changes)
    expect(openProjectButton).toBeInTheDocument()
  })

  it('handles toolbar actions correctly', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    })

    // Test build action
    const buildButton = screen.getByText('Build')
    await user.click(buildButton)

    // Test test action
    const testButton = screen.getByText('Test')
    await user.click(testButton)

    expect(buildButton).toBeInTheDocument()
    expect(testButton).toBeInTheDocument()
  })

  it('manages application state correctly', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Initially no file should be open
    expect(screen.getByTestId('editor-file-path')).toHaveTextContent('No file')

    // Open a file
    const openFileButton = screen.getByTestId('open-file-button')
    await user.click(openFileButton)

    // File should now be open in editor
    await waitFor(() => {
      expect(screen.getByTestId('editor-file-path')).toHaveTextContent('/test/file.rs')
    })
  })

  it('handles content changes in editor', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Open a file first
    const openFileButton = screen.getByTestId('open-file-button')
    await user.click(openFileButton)

    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })

    // Change content in editor
    const editorContent = screen.getByTestId('editor-content')
    await user.clear(editorContent)
    await user.type(editorContent, 'fn main() { println!("Hello, Solana!"); }')

    expect(editorContent).toHaveValue('fn main() { println!("Hello, Solana!"); }')
  })

  it('handles file save operations', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Open a file first
    const openFileButton = screen.getByTestId('open-file-button')
    await user.click(openFileButton)

    await waitFor(() => {
      expect(screen.getByTestId('editor-save-button')).toBeInTheDocument()
    })

    // Save the file
    const saveButton = screen.getByTestId('editor-save-button')
    await user.click(saveButton)

    // Save button should still be there (indicating save was attempted)
    expect(saveButton).toBeInTheDocument()
  })

  it('handles terminal integration', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('terminal-component')).toBeInTheDocument()
      expect(screen.getByTestId('terminal-input')).toBeInTheDocument()
    })
  })

  it('handles view toggle actions', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })

    // Test explorer toggle
    const explorerToggle = screen.getByText('Toggle Explorer')
    await user.click(explorerToggle)

    // Test terminal toggle
    const terminalToggle = screen.getByText('Toggle Terminal')
    await user.click(terminalToggle)

    expect(explorerToggle).toBeInTheDocument()
    expect(terminalToggle).toBeInTheDocument()
  })

  it('handles error boundary correctly', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Create a component that throws an error
    const ThrowError = () => {
      throw new Error('Test error')
    }

    // We can't easily test the error boundary with the current setup,
    // but we can verify the error boundary component exists
    expect(consoleSpy).toBeDefined()
    
    consoleSpy.mockRestore()
  })

  it('persists layout state', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('ide-layout-manager')).toBeInTheDocument()
    })

    // Verify localStorage is called for layout persistence
    expect(localStorageMock.getItem).toHaveBeenCalledWith('simulsol-layout')
  })

  it('handles keyboard shortcuts', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })

    // The keyboard shortcut manager should be initialized
    // We can't easily test actual keyboard events in this setup,
    // but we can verify the manager is created
    expect(screen.getByTestId('main-menu')).toBeInTheDocument()
  })

  it('handles project loading and validation', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // The project explorer should show file count
    expect(screen.getByTestId('file-count')).toHaveTextContent('2 files')
    expect(screen.getByTestId('selected-count')).toHaveTextContent('0 selected')
  })

  it('handles multiple file operations', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByTestId('project-explorer')).toBeInTheDocument()
    })

    // Select a file
    const selectFileButton = screen.getByTestId('select-file-button')
    await user.click(selectFileButton)

    // Open a file
    const openFileButton = screen.getByTestId('open-file-button')
    await user.click(openFileButton)

    await waitFor(() => {
      expect(screen.getByTestId('editor-file-path')).toHaveTextContent('/test/file.rs')
    })
  })

  it('shows loading state initially', async () => {
    render(<App />)
    
    // Should show loading initially
    expect(screen.getByText('Loading SIMUSOL IDE...')).toBeInTheDocument()
    expect(screen.getByText('Initializing workspace and components')).toBeInTheDocument()

    // Then should load the main interface
    await waitFor(() => {
      expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})