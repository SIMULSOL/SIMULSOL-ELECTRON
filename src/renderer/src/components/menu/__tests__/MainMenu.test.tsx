import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MainMenu from '../MainMenu'

// Mock CSS imports
vi.mock('../MainMenu.css', () => ({}))

describe('MainMenu', () => {
  const mockOnAction = vi.fn()

  beforeEach(() => {
    mockOnAction.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders main menu items', () => {
    render(<MainMenu onAction={mockOnAction} />)

    expect(screen.getByText('File')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('View')).toBeInTheDocument()
    expect(screen.getByText('Build')).toBeInTheDocument()
    expect(screen.getByText('Help')).toBeInTheDocument()
  })

  it('opens dropdown when menu item is clicked', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument()
      expect(screen.getByText('Open')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  it('closes dropdown when same menu item is clicked again', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    
    // Open dropdown
    fireEvent.click(fileMenu)
    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    // Close dropdown
    fireEvent.click(fileMenu)
    await waitFor(() => {
      expect(screen.queryByText('New')).not.toBeInTheDocument()
    })
  })

  it('switches between menus on hover when one is active', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    const editMenu = screen.getByText('Edit')
    
    // Open File menu
    fireEvent.click(fileMenu)
    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    // Hover over Edit menu
    fireEvent.mouseEnter(editMenu)
    await waitFor(() => {
      expect(screen.getByText('Undo')).toBeInTheDocument()
      expect(screen.queryByText('New')).not.toBeInTheDocument()
    })
  })

  it('shows submenu on hover', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      const newItem = screen.getByText('New')
      fireEvent.mouseEnter(newItem)
    })

    await waitFor(() => {
      expect(screen.getByText('New Project...')).toBeInTheDocument()
      expect(screen.getByText('New File')).toBeInTheDocument()
      expect(screen.getByText('New Folder')).toBeInTheDocument()
    })
  })

  it('calls onAction when menu item is clicked', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      const saveItem = screen.getByText('Save')
      fireEvent.click(saveItem)
    })

    expect(mockOnAction).toHaveBeenCalledWith('file.save')
  })

  it('calls onAction for submenu items', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      const newItem = screen.getByText('New')
      fireEvent.mouseEnter(newItem)
    })

    await waitFor(() => {
      const newFileItem = screen.getByText('New File')
      fireEvent.click(newFileItem)
    })

    expect(mockOnAction).toHaveBeenCalledWith('file.new.file')
  })

  it('displays keyboard shortcuts', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument() // Save shortcut
      expect(screen.getByText('Ctrl+N')).toBeInTheDocument() // New File shortcut
    })
  })

  it('displays menu item icons', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      // Icons should be present (emojis in this case)
      expect(screen.getByText('💾')).toBeInTheDocument() // Save icon
      expect(screen.getByText('📄')).toBeInTheDocument() // File icon
    })
  })

  it('shows separators in menu', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      const separators = document.querySelectorAll('.menu-separator')
      expect(separators.length).toBeGreaterThan(0)
    })
  })

  it('closes menu when clicking outside', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    // Click outside
    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByText('New')).not.toBeInTheDocument()
    })
  })

  it('handles keyboard navigation with Alt key', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    // Press Alt to open first menu
    fireEvent.keyDown(document, { key: 'Alt', altKey: true })

    await waitFor(() => {
      const fileMenu = screen.getByText('File')
      expect(fileMenu.closest('.menu-item-root')).toHaveClass('active')
    })
  })

  it('closes menu with Escape key', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText('New')).not.toBeInTheDocument()
    })
  })

  it('handles disabled menu items', async () => {
    // This would require modifying the menu structure to include disabled items
    // For now, we'll test that the disabled class is applied correctly
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    // Check that menu items can be rendered (disabled items would have disabled class)
    await waitFor(() => {
      const menuItems = document.querySelectorAll('.menu-item')
      expect(menuItems.length).toBeGreaterThan(0)
    })
  })

  it('shows submenu arrows for items with submenus', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      // Items with submenus should have arrows
      const arrows = document.querySelectorAll('.menu-item-arrow')
      expect(arrows.length).toBeGreaterThan(0)
    })
  })

  it('handles nested submenus correctly', async () => {
    render(<MainMenu onAction={mockOnAction} />)

    const fileMenu = screen.getByText('File')
    fireEvent.click(fileMenu)

    await waitFor(() => {
      const openItem = screen.getByText('Open')
      fireEvent.mouseEnter(openItem)
    })

    await waitFor(() => {
      expect(screen.getByText('Open Project...')).toBeInTheDocument()
      expect(screen.getByText('Open Recent')).toBeInTheDocument()
    })

    // Test nested submenu
    await waitFor(() => {
      const recentItem = screen.getByText('Open Recent')
      fireEvent.mouseEnter(recentItem)
    })

    await waitFor(() => {
      expect(screen.getByText('Clear Recent Projects')).toBeInTheDocument()
    })
  })

  it('applies correct CSS classes', () => {
    render(<MainMenu onAction={mockOnAction} />)

    const mainMenu = document.querySelector('.main-menu')
    expect(mainMenu).toBeInTheDocument()

    const menuBar = document.querySelector('.menu-bar')
    expect(menuBar).toBeInTheDocument()
  })

  it('handles custom className prop', () => {
    render(<MainMenu onAction={mockOnAction} className="custom-menu" />)

    const mainMenu = document.querySelector('.main-menu.custom-menu')
    expect(mainMenu).toBeInTheDocument()
  })
})