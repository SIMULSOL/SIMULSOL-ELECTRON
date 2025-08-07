import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LayoutProvider, useLayout } from '../LayoutContext'
import { PanelConfig } from '../IDELayoutManager'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Test component that uses the layout context
const TestComponent: React.FC = () => {
  const {
    layout,
    addPanel,
    removePanel,
    resizePanel,
    togglePanel,
    saveLayout,
    restoreLayout,
    isLayoutReady
  } = useLayout()

  const handleAddPanel = () => {
    const panel: PanelConfig = {
      id: 'test-panel',
      title: 'Test Panel',
      content: <div>Test Content</div>,
      position: 'left',
      size: 300
    }
    addPanel(panel)
  }

  const handleRemovePanel = () => {
    removePanel('test-panel')
  }

  const handleResizePanel = () => {
    resizePanel('test-panel', { width: 400 })
  }

  const handleTogglePanel = () => {
    togglePanel('test-panel')
  }

  const handleSaveLayout = () => {
    const saved = saveLayout()
    console.log('Saved layout:', saved)
  }

  const handleRestoreLayout = () => {
    const mockLayout = {
      panels: {},
      sizes: {},
      visibility: {},
      gridTemplate: {
        columns: '1fr',
        rows: '1fr',
        areas: '"main"'
      }
    }
    restoreLayout(mockLayout)
  }

  return (
    <div>
      <div data-testid="layout-ready">{isLayoutReady ? 'ready' : 'loading'}</div>
      <div data-testid="panel-count">{Object.keys(layout.panels).length}</div>
      <div data-testid="visible-panels">
        {Object.entries(layout.visibility).filter(([, visible]) => visible).length}
      </div>
      <button onClick={handleAddPanel}>Add Panel</button>
      <button onClick={handleRemovePanel}>Remove Panel</button>
      <button onClick={handleResizePanel}>Resize Panel</button>
      <button onClick={handleTogglePanel}>Toggle Panel</button>
      <button onClick={handleSaveLayout}>Save Layout</button>
      <button onClick={handleRestoreLayout}>Restore Layout</button>
    </div>
  )
}

describe('LayoutContext', () => {
  const mockOnLayoutChange = vi.fn()

  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    mockOnLayoutChange.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('provides layout context to children', () => {
    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    expect(screen.getByTestId('panel-count')).toHaveTextContent('0')
    expect(screen.getByTestId('visible-panels')).toHaveTextContent('0')
  })

  it('initializes as ready after mount', async () => {
    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })
  })

  it('loads persisted layout from localStorage', async () => {
    const persistedLayout = {
      panels: {
        'persisted-panel': {
          id: 'persisted-panel',
          title: 'Persisted Panel',
          content: null,
          position: 'left' as const
        }
      },
      sizes: {
        'persisted-panel': { width: 250, height: 200 }
      },
      visibility: {
        'persisted-panel': true
      },
      gridTemplate: {
        columns: '250px 1fr',
        rows: '1fr',
        areas: '"left main"'
      }
    }

    localStorageMock.getItem.mockReturnValue(JSON.stringify(persistedLayout))

    render(
      <LayoutProvider persistKey="test-layout" onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('panel-count')).toHaveTextContent('1')
      expect(screen.getByTestId('visible-panels')).toHaveTextContent('1')
    })

    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-layout')
  })

  it('handles corrupted localStorage data gracefully', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-json')

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load persisted layout:', expect.any(Error))
    expect(screen.getByTestId('panel-count')).toHaveTextContent('0')

    consoleSpy.mockRestore()
  })

  it('adds panel correctly', async () => {
    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })

    fireEvent.click(screen.getByText('Add Panel'))

    await waitFor(() => {
      expect(screen.getByTestId('panel-count')).toHaveTextContent('1')
      expect(screen.getByTestId('visible-panels')).toHaveTextContent('1')
    })

    expect(mockOnLayoutChange).toHaveBeenCalledWith(
      expect.objectContaining({
        panels: expect.objectContaining({
          'test-panel': expect.objectContaining({
            id: 'test-panel',
            title: 'Test Panel'
          })
        })
      })
    )
  })

  it('removes panel correctly', async () => {
    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })

    // Add panel first
    fireEvent.click(screen.getByText('Add Panel'))
    
    await waitFor(() => {
      expect(screen.getByTestId('panel-count')).toHaveTextContent('1')
    })

    // Then remove it
    fireEvent.click(screen.getByText('Remove Panel'))

    await waitFor(() => {
      expect(screen.getByTestId('panel-count')).toHaveTextContent('0')
      expect(screen.getByTestId('visible-panels')).toHaveTextContent('0')
    })
  })

  it('resizes panel correctly', async () => {
    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })

    // Add panel first
    fireEvent.click(screen.getByText('Add Panel'))
    
    await waitFor(() => {
      expect(screen.getByTestId('panel-count')).toHaveTextContent('1')
    })

    // Clear previous calls
    mockOnLayoutChange.mockClear()

    // Resize panel
    fireEvent.click(screen.getByText('Resize Panel'))

    await waitFor(() => {
      expect(mockOnLayoutChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sizes: expect.objectContaining({
            'test-panel': expect.objectContaining({
              width: 400
            })
          })
        })
      )
    })
  })

  it('toggles panel visibility correctly', async () => {
    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })

    // Add panel first
    fireEvent.click(screen.getByText('Add Panel'))
    
    await waitFor(() => {
      expect(screen.getByTestId('visible-panels')).toHaveTextContent('1')
    })

    // Toggle panel visibility
    fireEvent.click(screen.getByText('Toggle Panel'))

    await waitFor(() => {
      expect(screen.getByTestId('visible-panels')).toHaveTextContent('0')
    })

    // Toggle again
    fireEvent.click(screen.getByText('Toggle Panel'))

    await waitFor(() => {
      expect(screen.getByTestId('visible-panels')).toHaveTextContent('1')
    })
  })

  it('saves layout to localStorage', async () => {
    render(
      <LayoutProvider persistKey="test-save" onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })

    // Add a panel to create some layout state
    fireEvent.click(screen.getByText('Add Panel'))

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-save',
        expect.stringContaining('test-panel')
      )
    })
  })

  it('restores layout correctly', async () => {
    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })

    fireEvent.click(screen.getByText('Restore Layout'))

    await waitFor(() => {
      expect(mockOnLayoutChange).toHaveBeenCalledWith(
        expect.objectContaining({
          panels: {},
          sizes: {},
          visibility: {}
        })
      )
    })
  })

  it('throws error when useLayout is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useLayout must be used within a LayoutProvider')

    consoleSpy.mockRestore()
  })

  it('handles localStorage errors gracefully', async () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <LayoutProvider onLayoutChange={mockOnLayoutChange}>
        <TestComponent />
      </LayoutProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('layout-ready')).toHaveTextContent('ready')
    })

    fireEvent.click(screen.getByText('Add Panel'))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to persist layout:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })
})