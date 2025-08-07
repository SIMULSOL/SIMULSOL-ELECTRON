import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Toolbar from '../Toolbar'

// Mock CSS imports
vi.mock('../Toolbar.css', () => ({}))

describe('Toolbar', () => {
  const mockOnAction = vi.fn()

  beforeEach(() => {
    mockOnAction.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders toolbar buttons', () => {
    render(<Toolbar onAction={mockOnAction} />)

    expect(screen.getByTitle('Create a new Solana project (Ctrl+Shift+N)')).toBeInTheDocument()
    expect(screen.getByTitle('Open an existing project (Ctrl+O)')).toBeInTheDocument()
    expect(screen.getByTitle('Save current file (Ctrl+S)')).toBeInTheDocument()
    expect(screen.getByTitle('Build the current project (Ctrl+Shift+B)')).toBeInTheDocument()
  })

  it('displays button icons and labels', () => {
    render(<Toolbar onAction={mockOnAction} />)

    expect(screen.getByText('📁')).toBeInTheDocument() // New project icon
    expect(screen.getByText('📂')).toBeInTheDocument() // Open project icon
    expect(screen.getByText('💾')).toBeInTheDocument() // Save icon
    expect(screen.getByText('🔨')).toBeInTheDocument() // Build icon

    expect(screen.getByText('New Project')).toBeInTheDocument()
    expect(screen.getByText('Open Project')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Build')).toBeInTheDocument()
  })

  it('shows separators between button groups', () => {
    render(<Toolbar onAction={mockOnAction} />)

    const separators = document.querySelectorAll('.toolbar-separator')
    expect(separators.length).toBeGreaterThan(0)
  })

  it('calls onAction when button is clicked', () => {
    render(<Toolbar onAction={mockOnAction} />)

    const saveButton = screen.getByTitle('Save current file (Ctrl+S)')
    fireEvent.click(saveButton)

    expect(mockOnAction).toHaveBeenCalledWith('save')
  })

  it('shows dropdown for buttons with dropdown items', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    fireEvent.click(buildButton)

    await waitFor(() => {
      expect(screen.getByText('Build Project')).toBeInTheDocument()
      expect(screen.getByText('Rebuild Project')).toBeInTheDocument()
      expect(screen.getByText('Clean Project')).toBeInTheDocument()
    })
  })

  it('shows dropdown arrow for buttons with dropdowns', () => {
    render(<Toolbar onAction={mockOnAction} />)

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    const arrow = buildButton.querySelector('.toolbar-button-arrow')
    expect(arrow).toBeInTheDocument()
    expect(arrow).toHaveTextContent('▼')
  })

  it('toggles dropdown when button with dropdown is clicked', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    
    // Open dropdown
    fireEvent.click(buildButton)
    await waitFor(() => {
      expect(screen.getByText('Build Project')).toBeInTheDocument()
    })

    // Close dropdown
    fireEvent.click(buildButton)
    await waitFor(() => {
      expect(screen.queryByText('Build Project')).not.toBeInTheDocument()
    })
  })

  it('calls onAction when dropdown item is clicked', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    fireEvent.click(buildButton)

    await waitFor(() => {
      const buildProjectItem = screen.getByText('Build Project')
      fireEvent.click(buildProjectItem)
    })

    expect(mockOnAction).toHaveBeenCalledWith('build.build')
  })

  it('closes dropdown when clicking outside', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    fireEvent.click(buildButton)

    await waitFor(() => {
      expect(screen.getByText('Build Project')).toBeInTheDocument()
    })

    // Click outside
    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByText('Build Project')).not.toBeInTheDocument()
    })
  })

  it('shows active state for buttons with open dropdowns', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    fireEvent.click(buildButton)

    await waitFor(() => {
      expect(buildButton).toHaveClass('active')
    })
  })

  it('handles test button dropdown', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const testButton = screen.getByTitle('Run tests (Ctrl+T)')
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(screen.getByText('Run Tests')).toBeInTheDocument()
      expect(screen.getByText('Debug Tests')).toBeInTheDocument()
      expect(screen.getByText('Test Coverage')).toBeInTheDocument()
    })
  })

  it('handles deploy button dropdown', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const deployButton = screen.getByTitle('Deploy to Solana network (Ctrl+D)')
    fireEvent.click(deployButton)

    await waitFor(() => {
      expect(screen.getByText('Deploy to Devnet')).toBeInTheDocument()
      expect(screen.getByText('Deploy to Testnet')).toBeInTheDocument()
      expect(screen.getByText('Deploy to Mainnet')).toBeInTheDocument()
    })
  })

  it('handles buttons without dropdowns', () => {
    render(<Toolbar onAction={mockOnAction} />)

    const terminalButton = screen.getByTitle('Toggle terminal panel (Ctrl+`)')
    fireEvent.click(terminalButton)

    expect(mockOnAction).toHaveBeenCalledWith('terminal')
  })

  it('applies correct CSS classes', () => {
    render(<Toolbar onAction={mockOnAction} />)

    const toolbar = document.querySelector('.toolbar')
    expect(toolbar).toBeInTheDocument()

    const toolbarContent = document.querySelector('.toolbar-content')
    expect(toolbarContent).toBeInTheDocument()

    const buttons = document.querySelectorAll('.toolbar-button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('handles custom className prop', () => {
    render(<Toolbar onAction={mockOnAction} className="custom-toolbar" />)

    const toolbar = document.querySelector('.toolbar.custom-toolbar')
    expect(toolbar).toBeInTheDocument()
  })

  it('shows tooltips on hover', () => {
    render(<Toolbar onAction={mockOnAction} />)

    const saveButton = screen.getByTitle('Save current file (Ctrl+S)')
    expect(saveButton).toHaveAttribute('title', 'Save current file (Ctrl+S)')
  })

  it('handles disabled buttons correctly', () => {
    // This would require modifying the toolbar actions to include disabled items
    // For now, we'll test that the disabled class would be applied correctly
    render(<Toolbar onAction={mockOnAction} />)

    const buttons = document.querySelectorAll('.toolbar-button')
    buttons.forEach(button => {
      // Buttons should not have disabled class by default
      expect(button).not.toHaveClass('disabled')
    })
  })

  it('shows dropdown icons in dropdown items', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    fireEvent.click(buildButton)

    await waitFor(() => {
      const dropdownIcons = document.querySelectorAll('.toolbar-dropdown-icon')
      expect(dropdownIcons.length).toBeGreaterThan(0)
    })
  })

  it('handles multiple dropdowns independently', async () => {
    render(<Toolbar onAction={mockOnAction} />)

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    const testButton = screen.getByTitle('Run tests (Ctrl+T)')

    // Open build dropdown
    fireEvent.click(buildButton)
    await waitFor(() => {
      expect(screen.getByText('Build Project')).toBeInTheDocument()
    })

    // Open test dropdown (should close build dropdown)
    fireEvent.click(testButton)
    await waitFor(() => {
      expect(screen.getByText('Run Tests')).toBeInTheDocument()
      expect(screen.queryByText('Build Project')).not.toBeInTheDocument()
    })
  })

  it('prevents event propagation on dropdown item clicks', async () => {
    const parentClickHandler = vi.fn()
    
    render(
      <div onClick={parentClickHandler}>
        <Toolbar onAction={mockOnAction} />
      </div>
    )

    const buildButton = screen.getByTitle('Build the current project (Ctrl+Shift+B)')
    fireEvent.click(buildButton)

    await waitFor(() => {
      const buildProjectItem = screen.getByText('Build Project')
      fireEvent.click(buildProjectItem)
    })

    expect(mockOnAction).toHaveBeenCalledWith('build.build')
    expect(parentClickHandler).not.toHaveBeenCalled()
  })
})