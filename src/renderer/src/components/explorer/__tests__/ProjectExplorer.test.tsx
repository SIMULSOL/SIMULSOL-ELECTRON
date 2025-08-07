import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ProjectExplorer, { FileNode } from '../ProjectExplorer'

// Mock CSS imports
vi.mock('../ProjectExplorer.css', () => ({}))

describe('ProjectExplorer', () => {
  const mockOnFileSelect = vi.fn()
  const mockOnFileOpen = vi.fn()
  const mockOnFileCreate = vi.fn()
  const mockOnFileDelete = vi.fn()
  const mockOnFileRename = vi.fn()
  const mockOnRefresh = vi.fn()

  const sampleFiles: FileNode[] = [
    {
      name: 'src',
      path: '/project/src',
      type: 'directory',
      children: [
        {
          name: 'lib.rs',
          path: '/project/src/lib.rs',
          type: 'file',
          metadata: { size: 1024, modified: new Date('2023-01-01') }
        },
        {
          name: 'processor.rs',
          path: '/project/src/processor.rs',
          type: 'file',
          metadata: { size: 2048, modified: new Date('2023-01-02') }
        }
      ]
    },
    {
      name: 'Cargo.toml',
      path: '/project/Cargo.toml',
      type: 'file',
      metadata: { size: 256, modified: new Date('2023-01-03') }
    },
    {
      name: 'Anchor.toml',
      path: '/project/Anchor.toml',
      type: 'file',
      metadata: { size: 128, modified: new Date('2023-01-04') }
    }
  ]

  const defaultProps = {
    projectPath: '/project',
    files: sampleFiles,
    selectedFiles: [],
    onFileSelect: mockOnFileSelect,
    onFileOpen: mockOnFileOpen,
    onFileCreate: mockOnFileCreate,
    onFileDelete: mockOnFileDelete,
    onFileRename: mockOnFileRename,
    onRefresh: mockOnRefresh
  }

  beforeEach(() => {
    mockOnFileSelect.mockClear()
    mockOnFileOpen.mockClear()
    mockOnFileCreate.mockClear()
    mockOnFileDelete.mockClear()
    mockOnFileRename.mockClear()
    mockOnRefresh.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders project explorer with files', () => {
    render(<ProjectExplorer {...defaultProps} />)

    expect(screen.getByText('Explorer - project')).toBeInTheDocument()
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('Cargo.toml')).toBeInTheDocument()
    expect(screen.getByText('Anchor.toml')).toBeInTheDocument()
  })

  it('shows correct file icons', () => {
    render(<ProjectExplorer {...defaultProps} />)

    // Directory should show folder icon
    const srcNode = screen.getByText('src').closest('.explorer-node')
    expect(srcNode).toBeInTheDocument()

    // Rust files should have appropriate styling
    const cargoNode = screen.getByText('Cargo.toml').closest('.explorer-node')
    expect(cargoNode).toHaveClass('solana-rust')

    const anchorNode = screen.getByText('Anchor.toml').closest('.explorer-node')
    expect(anchorNode).toHaveClass('solana-anchor')
  })

  it('expands directory when clicked', async () => {
    render(<ProjectExplorer {...defaultProps} />)

    const srcNode = screen.getByText('src')
    fireEvent.click(srcNode)

    await waitFor(() => {
      expect(screen.getByText('lib.rs')).toBeInTheDocument()
      expect(screen.getByText('processor.rs')).toBeInTheDocument()
    })

    expect(mockOnFileSelect).toHaveBeenCalledWith('/project/src', false)
  })

  it('calls onFileOpen when file is double-clicked', () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.doubleClick(cargoFile)

    expect(mockOnFileOpen).toHaveBeenCalledWith('/project/Cargo.toml')
  })

  it('handles multi-select with Ctrl+click', () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.click(cargoFile, { ctrlKey: true })

    expect(mockOnFileSelect).toHaveBeenCalledWith('/project/Cargo.toml', true)
  })

  it('shows context menu on right-click', async () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    await waitFor(() => {
      expect(screen.getByText('📄 New File')).toBeInTheDocument()
      expect(screen.getByText('📁 New Folder')).toBeInTheDocument()
      expect(screen.getByText('✏️ Rename')).toBeInTheDocument()
      expect(screen.getByText('🗑️ Delete')).toBeInTheDocument()
    })
  })

  it('creates new file from context menu', async () => {
    // Mock window.prompt
    const mockPrompt = vi.fn().mockReturnValue('new-file.rs')
    Object.defineProperty(window, 'prompt', { value: mockPrompt, writable: true })

    mockOnFileCreate.mockResolvedValue(undefined)

    render(<ProjectExplorer {...defaultProps} />)

    const srcNode = screen.getByText('src')
    fireEvent.contextMenu(srcNode)

    await waitFor(() => {
      expect(screen.getByText('📄 New File')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('📄 New File'))

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalledWith('Enter file name:')
      expect(mockOnFileCreate).toHaveBeenCalledWith('/project/src', 'new-file.rs', 'file')
    })
  })

  it('creates new directory from context menu', async () => {
    const mockPrompt = vi.fn().mockReturnValue('new-folder')
    Object.defineProperty(window, 'prompt', { value: mockPrompt, writable: true })

    mockOnFileCreate.mockResolvedValue(undefined)

    render(<ProjectExplorer {...defaultProps} />)

    const srcNode = screen.getByText('src')
    fireEvent.contextMenu(srcNode)

    await waitFor(() => {
      expect(screen.getByText('📁 New Folder')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('📁 New Folder'))

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalledWith('Enter directory name:')
      expect(mockOnFileCreate).toHaveBeenCalledWith('/project/src', 'new-folder', 'directory')
    })
  })

  it('deletes file from context menu', async () => {
    const mockConfirm = vi.fn().mockReturnValue(true)
    Object.defineProperty(window, 'confirm', { value: mockConfirm, writable: true })

    mockOnFileDelete.mockResolvedValue(undefined)

    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    await waitFor(() => {
      expect(screen.getByText('🗑️ Delete')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('🗑️ Delete'))

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete "/project/Cargo.toml"?')
      expect(mockOnFileDelete).toHaveBeenCalledWith('/project/Cargo.toml')
    })
  })

  it('renames file from context menu', async () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    await waitFor(() => {
      expect(screen.getByText('✏️ Rename')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('✏️ Rename'))

    await waitFor(() => {
      const renameInput = screen.getByDisplayValue('Cargo.toml')
      expect(renameInput).toBeInTheDocument()
    })
  })

  it('handles rename input submission', async () => {
    mockOnFileRename.mockResolvedValue(undefined)

    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    await waitFor(() => {
      expect(screen.getByText('✏️ Rename')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('✏️ Rename'))

    await waitFor(() => {
      const renameInput = screen.getByDisplayValue('Cargo.toml')
      fireEvent.change(renameInput, { target: { value: 'NewCargo.toml' } })
      fireEvent.keyDown(renameInput, { key: 'Enter' })
    })

    await waitFor(() => {
      expect(mockOnFileRename).toHaveBeenCalledWith('/project/Cargo.toml', 'NewCargo.toml')
    })
  })

  it('cancels rename on Escape key', async () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    await waitFor(() => {
      expect(screen.getByText('✏️ Rename')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('✏️ Rename'))

    await waitFor(() => {
      const renameInput = screen.getByDisplayValue('Cargo.toml')
      fireEvent.keyDown(renameInput, { key: 'Escape' })
    })

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Cargo.toml')).not.toBeInTheDocument()
      expect(screen.getByText('Cargo.toml')).toBeInTheDocument()
    })
  })

  it('shows refresh button in header', () => {
    render(<ProjectExplorer {...defaultProps} />)

    const refreshButton = screen.getByTitle('Refresh')
    expect(refreshButton).toBeInTheDocument()

    fireEvent.click(refreshButton)
    expect(mockOnRefresh).toHaveBeenCalled()
  })

  it('shows new file and folder buttons in header', () => {
    render(<ProjectExplorer {...defaultProps} />)

    expect(screen.getByTitle('New File')).toBeInTheDocument()
    expect(screen.getByTitle('New Folder')).toBeInTheDocument()
  })

  it('displays file sizes for files', async () => {
    render(<ProjectExplorer {...defaultProps} />)

    // Expand src directory to see files
    const srcNode = screen.getByText('src')
    fireEvent.click(srcNode)

    await waitFor(() => {
      // File sizes should be displayed
      expect(screen.getByText('1.0 KB')).toBeInTheDocument() // lib.rs
      expect(screen.getByText('2.0 KB')).toBeInTheDocument() // processor.rs
    })
  })

  it('handles empty project state', () => {
    render(<ProjectExplorer {...defaultProps} files={[]} />)

    expect(screen.getByText('No files in project')).toBeInTheDocument()
    expect(screen.getByText('Create your first file')).toBeInTheDocument()
  })

  it('sorts files with directories first', () => {
    const mixedFiles: FileNode[] = [
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

    render(<ProjectExplorer {...defaultProps} files={mixedFiles} />)

    const nodes = screen.getAllByText(/^[a-z]/)
    expect(nodes[0]).toHaveTextContent('a-directory') // Directory first
    expect(nodes[1]).toHaveTextContent('b-file.rs')   // Then files alphabetically
    expect(nodes[2]).toHaveTextContent('z-file.rs')
  })

  it('handles drag and drop operations', async () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    const srcDir = screen.getByText('src')

    // Start drag
    fireEvent.dragStart(cargoFile, {
      dataTransfer: {
        effectAllowed: 'move',
        setData: vi.fn()
      }
    })

    // Drag over directory
    fireEvent.dragOver(srcDir, {
      dataTransfer: { dropEffect: 'move' },
      preventDefault: vi.fn()
    })

    // Drop
    fireEvent.drop(srcDir, {
      dataTransfer: { getData: vi.fn().mockReturnValue('/project/Cargo.toml') },
      preventDefault: vi.fn()
    })

    await waitFor(() => {
      expect(mockOnFileRename).toHaveBeenCalledWith('/project/Cargo.toml', '/project/src/Cargo.toml')
    })
  })

  it('closes context menu when clicking outside', async () => {
    render(<ProjectExplorer {...defaultProps} />)

    const cargoFile = screen.getByText('Cargo.toml')
    fireEvent.contextMenu(cargoFile)

    await waitFor(() => {
      expect(screen.getByText('📄 New File')).toBeInTheDocument()
    })

    // Click outside the context menu
    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByText('📄 New File')).not.toBeInTheDocument()
    })
  })

  it('handles selected files highlighting', () => {
    const propsWithSelection = {
      ...defaultProps,
      selectedFiles: ['/project/Cargo.toml']
    }

    render(<ProjectExplorer {...propsWithSelection} />)

    const cargoNode = screen.getByText('Cargo.toml').closest('.explorer-node')
    expect(cargoNode).toHaveClass('selected')
  })

  it('handles error states gracefully', async () => {
    const mockAlert = vi.fn()
    Object.defineProperty(window, 'alert', { value: mockAlert, writable: true })

    mockOnFileCreate.mockRejectedValue(new Error('Permission denied'))

    const mockPrompt = vi.fn().mockReturnValue('test-file.rs')
    Object.defineProperty(window, 'prompt', { value: mockPrompt, writable: true })

    render(<ProjectExplorer {...defaultProps} />)

    const srcNode = screen.getByText('src')
    fireEvent.contextMenu(srcNode)

    await waitFor(() => {
      expect(screen.getByText('📄 New File')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('📄 New File'))

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Failed to create file: Permission denied')
    })
  })
})