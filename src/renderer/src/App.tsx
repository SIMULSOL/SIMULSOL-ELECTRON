import React, { useEffect, useCallback } from 'react'
import { LayoutProvider, useLayout } from './components/layout/LayoutContext'
import IDELayoutManager from './components/layout/IDELayoutManager'
import { MainMenu, Toolbar, KeyboardShortcutManager } from './components/menu'
import Versions from './components/Versions'
import { ProjectExplorer, useProjectExplorer } from './components/explorer'

// Global keyboard shortcut manager
const keyboardManager = new KeyboardShortcutManager()

// Sample content components for demonstration
const SampleSidebar: React.FC = () => {
  const [explorerState, explorerActions] = useProjectExplorer()

  React.useEffect(() => {
    // Load a sample project on mount
    explorerActions.loadProject('/sample-project')
  }, [])

  return (
    <ProjectExplorer
      projectPath={explorerState.projectPath}
      files={explorerState.files}
      selectedFiles={explorerState.selectedFiles}
      onFileSelect={explorerActions.selectFile}
      onFileOpen={explorerActions.openFile}
      onFileCreate={explorerActions.createFile}
      onFileDelete={explorerActions.deleteFile}
      onFileRename={explorerActions.renameFile}
      onRefresh={explorerActions.refreshProject}
    />
  )
}

const SampleMainContent: React.FC = () => (
  <div style={{ padding: '16px', height: '100%', backgroundColor: '#1e1e1e' }}>
    <h2>SIMUSOL Core</h2>
    <p>Welcome to the SIMUSOL! This is the main content area where your code editor will be.</p>
    <Versions />
  </div>
)

const SampleBottomPanel: React.FC = () => (
  <div style={{ padding: '16px' }}>
    <h3>Terminal / Output</h3>
    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
      <div>$ solana --version</div>
      <div>solana-cli 1.18.0</div>
      <div>$ anchor --version</div>
      <div>anchor-cli 0.29.0</div>
    </div>
  </div>
)

const IDEContent: React.FC = () => {
  const { addPanel, togglePanel, isLayoutReady } = useLayout()

  // Handle menu and toolbar actions
  const handleAction = useCallback((actionId: string) => {
    console.log('Action triggered:', actionId)
    
    switch (actionId) {
      // File operations
      case 'file.new.project':
        console.log('Creating new project...')
        break
      case 'file.new.file':
        console.log('Creating new file...')
        break
      case 'file.open.project':
        console.log('Opening project...')
        break
      case 'file.save':
        console.log('Saving file...')
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
      case 'build':
        console.log('Building project...')
        break
      case 'build.test':
      case 'test':
        console.log('Running tests...')
        break
      case 'build.deploy':
      case 'deploy':
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
  }, [togglePanel])

  // Set up keyboard shortcuts
  useEffect(() => {
    keyboardManager.addListener('app', handleAction)
    
    return () => {
      keyboardManager.removeListener('app')
    }
  }, [handleAction])

  useEffect(() => {
    if (isLayoutReady) {
      // Add menu and toolbar as fixed panels
      addPanel({
        id: 'menu',
        title: 'Menu',
        content: <MainMenu onAction={handleAction} />,
        position: 'top',
        size: 30,
        resizable: false,
        closable: false
      })

      addPanel({
        id: 'toolbar',
        title: 'Toolbar',
        content: <Toolbar onAction={handleAction} />,
        position: 'top',
        size: 40,
        resizable: false,
        closable: false
      })

      // Add default panels
      addPanel({
        id: 'sidebar',
        title: 'Explorer',
        content: <SampleSidebar />,
        position: 'left',
        size: 250,
        resizable: true,
        closable: true
      })

      addPanel({
        id: 'main',
        title: 'Editor',
        content: <SampleMainContent />,
        position: 'center',
        resizable: false,
        closable: false
      })

      addPanel({
        id: 'terminal',
        title: 'Terminal',
        content: <SampleBottomPanel />,
        position: 'bottom',
        size: 200,
        resizable: true,
        closable: true
      })
    }
  }, [addPanel, isLayoutReady, handleAction])

  if (!isLayoutReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#cccccc'
      }}>
        Loading IDE...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <MainMenu onAction={handleAction} />
      <Toolbar onAction={handleAction} />
      <div style={{ flex: 1 }}>
        <IDELayoutManager />
      </div>
    </div>
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
