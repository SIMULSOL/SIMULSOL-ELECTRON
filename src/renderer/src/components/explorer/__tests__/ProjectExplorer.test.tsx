import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ProjectExplorer, { FileNode, ProjectExplorerProps } from '../ProjectExplorer'

// Mock CSS imports
vi.mock('../ProjectExplorer.css', () => ({}))

describe('ProjectExplorer', () => {
  const mockFiles: FileNode[] = [
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
        },
        {
          name: 'processor.rs',
          path: '/project/src/processor.rs',
          type: 'file',
          metadata: { size: 2048, modified: new Date() }
        }
      ]
    },
    {
      name: 'Cargo.toml',
      path: '/project/Cargo.toml',
      type: 'file',
      metadata: { size: 256, modified: new Date() }
    },
    {
      name: 'Anchor.toml',
      path: '/project/Anchor.toml',
      type: 'file',
      metadata: { size: 128, modified: new Date() }
    }
  ]

  const defaultProps: ProjectExplorerProps = {
    projectPath: '/project',
    files: mockFiles,
    selectedFiles: [],
    validationErrors: [],
    onFileSelect: vi.fn(),
    onFileOpen: vi.fn(),
    onFileCreate: vi.fn(),
    onFileDelete: vi.fn(),
    onFileRename: vi.fn(),
    onRefresh: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders project explorer with header', () => {
    render(<ProjectExplorer {...defaultProps} />)

    expect(screen.getByText('Explorer - project')).toBeInTheDocument()
    expect(screen.getByTitle('Refresh')).toBeInTheDocument()
    expect(screen.getByTitle('New File')).toBeInTheDocument()
    expect(screen.getByTitle('New Folder')).toBeInTheDocument()
  })

  it('displays file tree structure', () => {
    render(<ProjectExplorer {...defaultProps} />)

    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('Cargo.toml')).toBeInTheDocument()
    expect(screen.getByText('Anchor.toml')).toBeInTheDocument()
  })

  it('shows Solana-specific file icons', () => {
    render(<ProjectExplorer {...defaultProps} />)

    // Check for Rust file icon
    const cargoToml = screen.getByText('Cargo.toml').closest('.explorer-node')
    expect(cargoToml).toHaveClass('solana-rust')

    // Check for Anchor file icon
    const anchorToml = screen.getByText('Anchor.toml').closest('.explorer-node')
    expect(anchorToml).toHaveClass('solana-anchor')
  })

  it('expands and collapses directories', () => {
    render(<ProjectExplorer {...defaultProps} />)

    const srcDirectory = screen.getByText('src')
    
    // Initially collapsed - children should not be visible
    expect(screen.queryByText('lib.rs')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(srcDirectory)
    expect(screen.getByText('lib.rs')).toBeInTheDocument()
    expect(screen.getByText('processor.rs')).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(srcDirectory)
    expect(screen.queryByText('lib.rs')).not.toBeInTheDocument()
  })

  it('calls onFileSelect when file is clicked', () => {
    const onFileSelect = vi.fn()
    render(<ProjectExplorer {...defaultProps} onFileSelect={onFileSelect} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.click(cargoFile)

    expect(onFileSelect).toHaveBeenCalledWith('/project/Cargo.toml', false)
  })

  it('calls onFileSelect with multi-select when Ctrl+click', () => {
    const onFileSelect = vi.fn()
    render(<ProjectExplorer {...defaultProps} onFileSelect={onFileSelect} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.click(cargoFile, { ctrlKey: true })

    expect(onFileSelect).toHaveBeenCalledWith('/project/Cargo.toml', true)
  })

  it('calls onFileOpen when file is double-clicked', () => {
    const onFileOpen = vi.fn()
    render(<ProjectExplorer {...defaultProps} onFileOpen={onFileOpen} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.doubleClick(cargoFile)

    expect(onFileOpen).toHaveBeenCalledWith('/project/Cargo.toml')
  })

  it('shows selected files with selected class', () => {
    const selectedFiles = ['/project/Cargo.toml']
    render(<ProjectExplorer {...defaultProps} selectedFiles={selectedFiles} />)

    const cargoFile = screen.getByText('Cargo.toml').closest('.explorer-node')
    expect(cargoFile).toHaveClass('selected')
  })

  it('shows context menu on right-click', () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    expect(screen.getByText('📄 New File')).toBeInTheDocument()
    expect(screen.getByText('📁 New Folder')).toBeInTheDocument()
    expect(screen.getByText('✏️ Rename')).toBeInTheDocument()
    expect(screen.getByText('🗑️ Delete')).toBeInTheDocument()
    expect(screen.getByText('🔄 Refresh')).toBeInTheDocument()
  })

  it('creates new file when context menu item is clicked', async () => {
    const onFileCreate = vi.fn().mockResolvedValue(undefined)
    render(<ProjectExplorer {...defaultProps} onFileCreate={onFileCreate} />)

    // Mock window.prompt
    const originalPrompt = window.prompt
    window.prompt = vi.fn().mockReturnValue('new-file.rs')

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    const newFileItem = screen.getByText('📄 New File')
    fireEvent.click(newFileItem)

    await waitFor(() => {
      expect(onFileCreate).toHaveBeenCalledWith('/project/Cargo.toml', 'new-file.rs', 'file')
    })

    // Restore window.prompt
    window.prompt = originalPrompt
  })

  it('creates new folder when context menu item is clicked', async () => {
    const onFileCreate = vi.fn().mockResolvedValue(undefined)
    render(<ProjectExplorer {...defaultProps} onFileCreate={onFileCreate} />)

    // Mock window.prompt
    const originalPrompt = window.prompt
    window.prompt = vi.fn().mockReturnValue('new-folder')

    const srcDirectory = screen.getByText('src')
    fireEvent.contextMenu(srcDirectory)

    const newFolderItem = screen.getByText('📁 New Folder')
    fireEvent.click(newFolderItem)

    await waitFor(() => {
      expect(onFileCreate).toHaveBeenCalledWith('/project/src', 'new-folder', 'directory')
    })

    // Restore window.prompt
    window.prompt = originalPrompt
  })

  it('deletes file when context menu delete is clicked', async () => {
    const onFileDelete = vi.fn().mockResolvedValue(undefined)
    render(<ProjectExplorer {...defaultProps} onFileDelete={onFileDelete} />)

    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(true)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    const deleteItem = screen.getByText('🗑️ Delete')
    fireEvent.click(deleteItem)

    await waitFor(() => {
      expect(onFileDelete).toHaveBeenCalledWith('/project/Cargo.toml')
    })

    // Restore window.confirm
    window.confirm = originalConfirm
  })

  it('cancels delete when user clicks cancel', async () => {
    const onFileDelete = vi.fn()
    render(<ProjectExplorer {...defaultProps} onFileDelete={onFileDelete} />)

    // Mock window.confirm to return false
    const originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(false)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    const deleteItem = screen.getByText('🗑️ Delete')
    fireEvent.click(deleteItem)

    await waitFor(() => {
      expect(onFileDelete).not.toHaveBeenCalled()
    })

    // Restore window.confirm
    window.confirm = originalConfirm
  })

  it('enters rename mode when context menu rename is clicked', () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    const renameItem = screen.getByText('✏️ Rename')
    fireEvent.click(renameItem)

    // Should show rename input
    const renameInput = screen.getByDisplayValue('Cargo.toml')
    expect(renameInput).toBeInTheDocument()
    expect(renameInput).toHaveClass('rename-input')
  })

  it('renames file when Enter is pressed in rename input', async () => {
    const onFileRename = vi.fn().mockResolvedValue(undefined)
    render(<ProjectExplorer {...defaultProps} onFileRename={onFileRename} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    const renameItem = screen.getByText('✏️ Rename')
    fireEvent.click(renameItem)

    const renameInput = screen.getByDisplayValue('Cargo.toml')
    fireEvent.change(renameInput, { target: { value: 'NewCargo.toml' } })
    fireEvent.keyDown(renameInput, { key: 'Enter' })

    await waitFor(() => {
      expect(onFileRename).toHaveBeenCalledWith('/project/Cargo.toml', 'NewCargo.toml')
    })
  })

  it('cancels rename when Escape is pressed', () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    const renameItem = screen.getByText('✏️ Rename')
    fireEvent.click(renameItem)

    const renameInput = screen.getByDisplayValue('Cargo.toml')
    fireEvent.keyDown(renameInput, { key: 'Escape' })

    // Should exit rename mode
    expect(screen.queryByDisplayValue('Cargo.toml')).not.toBeInTheDocument()
    expect(screen.getByText('Cargo.toml')).toBeInTheDocument()
  })

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn()
    render(<ProjectExplorer {...defaultProps} onRefresh={onRefresh} />)

    const refreshButton = screen.getByTitle('Refresh')
    fireEvent.click(refreshButton)

    expect(onRefresh).toHaveBeenCalled()
  })

  it('shows empty state when no files', () => {
    render(<ProjectExplorer {...defaultProps} files={[]} />)

    expect(screen.getByText('No files in project')).toBeInTheDocument()
    expect(screen.getByText('Create your first file')).toBeInTheDocument()
  })

  it('creates file from empty state button', async () => {
    const onFileCreate = vi.fn().mockResolvedValue(undefined)
    render(<ProjectExplorer {...defaultProps} files={[]} onFileCreate={onFileCreate} />)

    // Mock window.prompt
    const originalPrompt = window.prompt
    window.prompt = vi.fn().mockReturnValue('first-file.rs')

    const createButton = screen.getByText('Create your first file')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(onFileCreate).toHaveBeenCalled()
    })

    // Restore window.prompt
    window.prompt = originalPrompt
  })

  it('displays validation errors when present', () => {
    const validationErrors = [
      {
        file: 'Cargo.toml',
        message: 'Missing required dependency',
        suggestion: 'Add solana-program to dependencies'
      }
    ]

    render(<ProjectExplorer {...defaultProps} validationErrors={validationErrors} />)

    expect(screen.getByText('Project Configuration Issues')).toBeInTheDocument()
    expect(screen.getByText('Cargo.toml')).toBeInTheDocument()
    expect(screen.getByText('Missing required dependency')).toBeInTheDocument()
    expect(screen.getByText('Add solana-program to dependencies')).toBeInTheDocument()
  })

  it('calls onValidateProject when re-validate button is clicked', () => {
    const onValidateProject = vi.fn()
    const validationErrors = [
      {
        file: 'Cargo.toml',
        message: 'Missing required dependency',
        suggestion: 'Add solana-program to dependencies'
      }
    ]

    render(
      <ProjectExplorer 
        {...defaultProps} 
        validationErrors={validationErrors}
        onValidateProject={onValidateProject}
      />
    )

    const revalidateButton = screen.getByTitle('Re-validate Project')
    fireEvent.click(revalidateButton)

    expect(onValidateProject).toHaveBeenCalled()
  })

  it('sorts files with directories first', () => {
    const unsortedFiles: FileNode[] = [
      {
        name: 'z-file.rs',
        path: '/project/z-file.rs',
        type: 'file'
      },
      {
        name: 'a-directory',
        path: '/project/a-directory',
        type: 'directory',
        children: []
      },
      {
        name: 'b-file.rs',
        path: '/project/b-file.rs',
        type: 'file'
      }
    ]

    render(<ProjectExplorer {...defaultProps} files={unsortedFiles} />)

    const nodes = screen.getAllByText(/^[ab-z]/)
    expect(nodes[0]).toHaveTextContent('a-directory') // Directory first
    expect(nodes[1]).toHaveTextContent('b-file.rs')   // Then files alphabetically
    expect(nodes[2]).toHaveTextContent('z-file.rs')
  })

  it('displays file sizes for files with metadata', () => {
    render(<ProjectExplorer {...defaultProps} />)

    // Expand src directory to see files with metadata
    const srcDirectory = screen.getByText('src')
    fireEvent.click(srcDirectory)

    // Check that file sizes are displayed
    expect(screen.getByText('1.0 KB')).toBeInTheDocument() // lib.rs size
    expect(screen.getByText('2.0 KB')).toBeInTheDocument() // processor.rs size
  })

  it('handles drag and drop operations', () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    const srcDirectory = screen.getByText('src')

    // Start drag
    fireEvent.dragStart(cargoFile, {
      dataTransfer: {
        effectAllowed: 'move',
        setData: vi.fn()
      }
    })

    // Drag over directory
    fireEvent.dragOver(srcDirectory, {
      dataTransfer: {
        dropEffect: 'move'
      }
    })

    // Check drag target styling
    const srcNode = srcDirectory.closest('.explorer-node')
    expect(srcNode).toHaveClass('drag-target')
  })

  it('closes context menu when clicking outside', async () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    expect(screen.getByText('📄 New File')).toBeInTheDocument()

    // Click outside
    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByText('📄 New File')).not.toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    render(<ProjectExplorer {...defaultProps} className="custom-explorer" />)

    const explorer = document.querySelector('.project-explorer.custom-explorer')
    expect(explorer).toBeInTheDocument()
  })

  it('handles error in file operations gracefully', async () => {
    const onFileCreate = vi.fn().mockRejectedValue(new Error('Permission denied'))
    render(<ProjectExplorer {...defaultProps} onFileCreate={onFileCreate} />)

    // Mock window.prompt and alert
    const originalPrompt = window.prompt
    const originalAlert = window.alert
    window.prompt = vi.fn().mockReturnValue('new-file.rs')
    window.alert = vi.fn()

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    const newFileItem = screen.getByText('📄 New File')
    fireEvent.click(newFileItem)

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to create file: Permission denied')
    })

    // Restore mocks
    window.prompt = originalPrompt
    window.alert = originalAlert
  })
})