import React, { useEffect, useCallback, useState, useRef } from 'react'
import { LayoutProvider, useLayout } from './components/layout/LayoutContext'
import IDELayoutManager from './components/layout/IDELayoutManager'
import { MainMenu, Toolbar, KeyboardShortcutManager } from './components/menu'
import { ProjectExplorer } from './components/explorer'
import useProjectExplorer from './components/explorer/useProjectExplorer'
import { CodeEditor, useCodeEditor } from './components/editor'
import { TerminalComponent, useTerminal } from './components/terminal'

// Global keyboard shortcut manager
const keyboardManager = new KeyboardShortcutManager()

// Application state management
interface AppState {
  currentFile: string | null
  openFiles: Map<string, { content: string; isDirty: boolean; language: string }>
  activeProject: string | null
}

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('IDE Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#1e1e1e',
            color: '#f44747',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Real sidebar component with project explorer
const ProjectSidebar: React.FC<{
  onFileOpen: (filePath: string) => void
  activeProject: string | null
  onProjectLoad: (projectPath: string) => void
}> = ({ onFileOpen, activeProject, onProjectLoad }) => {
  const [explorerState, explorerActions] = useProjectExplorer()

  // Load project when activeProject changes
  useEffect(() => {
    if (activeProject && activeProject !== explorerState.projectPath) {
      explorerActions.loadProject(activeProject)
      onProjectLoad(activeProject)
    }
  }, [activeProject, explorerState.projectPath, explorerActions, onProjectLoad])

  // Handle file open with proper integration
  const handleFileOpen = useCallback(
    (filePath: string) => {
      explorerActions.openFile(filePath)
      onFileOpen(filePath)
    },
    [explorerActions, onFileOpen]
  )

  return (
    <ErrorBoundary>
      <ProjectExplorer
        projectPath={explorerState.projectPath}
        files={explorerState.files}
        selectedFiles={explorerState.selectedFiles}
        validationErrors={explorerState.validationErrors}
        onFileSelect={explorerActions.selectFile}
        onFileOpen={handleFileOpen}
        onFileCreate={explorerActions.createFile}
        onFileDelete={explorerActions.deleteFile}
        onFileRename={explorerActions.renameFile}
        onRefresh={explorerActions.refreshProject}
        onValidateProject={explorerActions.validateProject}
      />
    </ErrorBoundary>
  )
}

// Real main content area with code editor
const EditorMainContent: React.FC<{
  currentFile: string | null
  onContentChange: (filePath: string, content: string, isDirty: boolean) => void
  onFileSave: (filePath: string) => void
}> = ({ currentFile, onContentChange, onFileSave }) => {
  const {
    content,
    isDirty,
    isLoading,
    diagnostics,
    editorRef,
    loadFile,
    saveFile,
    setContent,
    getLanguageFromFilePath
  } = useCodeEditor({
    filePath: currentFile || undefined,
    autoSave: false
  })

  // Load file when currentFile changes
  useEffect(() => {
    if (currentFile) {
      loadFile(currentFile)
    }
  }, [currentFile, loadFile])

  // Handle content changes
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      if (currentFile) {
        onContentChange(currentFile, newContent, true)
      }
    },
    [currentFile, setContent, onContentChange]
  )

  // Handle save
  const handleSave = useCallback(
    async (content: string) => {
      if (currentFile) {
        await saveFile()
        onFileSave(currentFile)
        onContentChange(currentFile, content, false)
      }
    },
    [currentFile, saveFile, onFileSave, onContentChange]
  )

  if (!currentFile) {
    return (
      <div
        style={{
          padding: '20px',
          height: '100%',
          backgroundColor: '#1e1e1e',
          color: '#cccccc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <h2>SIMUSOL Core</h2>
        <p>Welcome to the Solana IDE! Open a file from the project explorer to start editing.</p>
        <div style={{ marginTop: '20px', fontSize: '14px', opacity: 0.7 }}>
          <p>• Create a new project or open an existing one</p>
          <p>• Browse files in the project explorer</p>
          <p>• Double-click a file to open it in the editor</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* File tab bar */}
        <div
          style={{
            height: '32px',
            backgroundColor: '#2d2d30',
            borderBottom: '1px solid #3e3e42',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '8px'
          }}
        >
          <div
            style={{
              padding: '4px 12px',
              backgroundColor: '#1e1e1e',
              color: isDirty ? '#f9f9f9' : '#cccccc',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {currentFile.split('/').pop()}
            {isDirty && <span style={{ color: '#f9f9f9' }}>●</span>}
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1 }}>
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                backgroundColor: '#1e1e1e',
                color: '#cccccc'
              }}
            >
              Loading file...
            </div>
          ) : (
            <CodeEditor
              ref={editorRef}
              filePath={currentFile}
              content={content}
              language={getLanguageFromFilePath(currentFile)}
              onContentChange={handleContentChange}
              onSave={handleSave}
              diagnostics={diagnostics}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}

// Real terminal panel
const TerminalPanel: React.FC = () => {
  const { sessions, activeSessionId, createSession, setActiveSession, onSessionCreate } =
    useTerminal()

  // Create initial terminal session
  useEffect(() => {
    if (sessions.length === 0) {
      // Use a default working directory instead of process.cwd()
      // In a real application, this should come from the workspace or project settings
      createSession({ cwd: '.' })
    }
  }, [sessions.length, createSession])

  return (
    <ErrorBoundary>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Terminal tabs */}
        {sessions.length > 1 && (
          <div
            style={{
              height: '32px',
              backgroundColor: '#2d2d30',
              borderBottom: '1px solid #3e3e42',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                style={{
                  padding: '4px 12px',
                  backgroundColor: session.id === activeSessionId ? '#1e1e1e' : 'transparent',
                  color: '#cccccc',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {session.title}
              </button>
            ))}
          </div>
        )}

        {/* Terminal content */}
        <div style={{ flex: 1 }}>
          <TerminalComponent
            config={{ cwd: '.', theme: 'dark' }}
            onSessionCreate={onSessionCreate}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}

const IDEContent: React.FC = () => {
  const { addPanel, togglePanel, isLayoutReady, layout } = useLayout()

  // Application state
  const [appState, setAppState] = useState<AppState>({
    currentFile: null,
    openFiles: new Map(),
    activeProject: null
  })

  // Handle file opening from project explorer
  const handleFileOpen = useCallback((filePath: string) => {
    setAppState((prev) => ({
      ...prev,
      currentFile: filePath
    }))
  }, [])

  // Handle content changes in editor
  const handleContentChange = useCallback((filePath: string, content: string, isDirty: boolean) => {
    setAppState((prev) => {
      const newOpenFiles = new Map(prev.openFiles)
      const existingFile = newOpenFiles.get(filePath) || {
        content: '',
        isDirty: false,
        language: 'rust'
      }
      newOpenFiles.set(filePath, {
        ...existingFile,
        content,
        isDirty
      })

      return {
        ...prev,
        openFiles: newOpenFiles
      }
    })
  }, [])

  // Handle file save
  const handleFileSave = useCallback((filePath: string) => {
    setAppState((prev) => {
      const newOpenFiles = new Map(prev.openFiles)
      const existingFile = newOpenFiles.get(filePath)
      if (existingFile) {
        newOpenFiles.set(filePath, {
          ...existingFile,
          isDirty: false
        })
      }

      return {
        ...prev,
        openFiles: newOpenFiles
      }
    })
  }, [])

  // Handle project loading
  const handleProjectLoad = useCallback((projectPath: string) => {
    setAppState((prev) => ({
      ...prev,
      activeProject: projectPath
    }))
  }, [])

  // Handle menu and toolbar actions
  const handleAction = useCallback(
    (actionId: string) => {
      console.log('Action triggered:', actionId)

      switch (actionId) {
        // File operations
        case 'file.new.project':
          // TODO: Implement new project dialog
          console.log('Creating new project...')
          break
        case 'file.new.file':
          // TODO: Implement new file dialog
          console.log('Creating new file...')
          break
        case 'file.open.project':
          // TODO: Implement project open dialog
          console.log('Opening project...')
          // For now, load a sample project
          handleProjectLoad('/sample-project')
          break
        case 'file.save':
          if (appState.currentFile) {
            // Trigger save on current file
            console.log('Saving file:', appState.currentFile)
          }
          break

        // View operations
        case 'view.explorer':
        case 'explorer':
          togglePanel('sidebar')
          break
        case 'view.terminal':
        case 'terminal':
          togglePanel('terminal')
          break

        // Build operations
        case 'build.build':
          console.log('Building project...')
          break
        case 'build.test':
          console.log('Running tests...')
          break
        case 'build.deploy':
          console.log('Deploying to devnet...')
          break

        // Help
        case 'help.docs':
          window.open('https://docs.solana.com', '_blank')
          break
        case 'help.about':
          alert('SIMUSOL Core v1.0.0\nA comprehensive development environment for Solana programs.')
          break

        default:
          console.log('Unhandled action:', actionId)
      }
    },
    [togglePanel, appState.currentFile, handleProjectLoad]
  )

  // Set up keyboard shortcuts
  useEffect(() => {
    keyboardManager.addListener('app', handleAction)

    return () => {
      keyboardManager.removeListener('app')
    }
  }, [handleAction])

  // Track if panels have been initialized to prevent re-initialization
  const [panelsInitialized, setPanelsInitialized] = useState(false)

  // Initialize panels when layout is ready (only once)
  useEffect(() => {
    if (isLayoutReady && !panelsInitialized) {
      // Add default panels without content (content will be provided via component registry)
      addPanel({
        id: 'sidebar',
        title: 'Explorer',
        position: 'left',
        size: 250,
        resizable: true,
        closable: true
      })

      addPanel({
        id: 'main',
        title: 'Editor',
        position: 'center',
        resizable: false,
        closable: false
      })

      addPanel({
        id: 'terminal',
        title: 'Terminal',
        position: 'bottom',
        size: 200,
        resizable: true,
        closable: true
      })

      setPanelsInitialized(true)
    }
  }, [isLayoutReady, panelsInitialized, addPanel])

  // Create component registry and props for panels
  const componentRegistry = {
    sidebar: ProjectSidebar,
    main: EditorMainContent,
    terminal: TerminalPanel
  }

  const componentProps = {
    sidebar: {
      onFileOpen: handleFileOpen,
      activeProject: appState.activeProject,
      onProjectLoad: handleProjectLoad
    },
    main: {
      currentFile: appState.currentFile,
      onContentChange: handleContentChange,
      onFileSave: handleFileSave
    },
    terminal: {}
  }

  if (!isLayoutReady) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#1e1e1e',
          color: '#cccccc'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading SIMUSOL IDE...</div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Initializing workspace and components
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

        <MainMenu onAction={handleAction} />
        <Toolbar onAction={handleAction} />
        <div style={{ flex: 1 }}>
          <IDELayoutManager componentRegistry={componentRegistry} componentProps={componentProps} />
        </div>
      </div>
    </ErrorBoundary>
  )
}

function App(): React.JSX.Element {
  return (
    <LayoutProvider persistKey="simulsol-layout">
      <IDEContent />
    </LayoutProvider>
  )
}

export default App
