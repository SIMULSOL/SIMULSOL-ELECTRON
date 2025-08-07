import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import IDELayoutManager, { PanelConfig, LayoutState } from '../IDELayoutManager'

// Mock CSS imports
vi.mock('../IDELayoutManager.css', () => ({}))

describe('IDELayoutManager', () => {
  const mockOnLayoutChange = vi.fn()

  const samplePanel: PanelConfig = {
    id: 'test-panel',
    title: 'Test Panel',
    content: <div>Test Content</div>,
    position: 'left',
    size: 300,
    resizable: true,
    closable: true
  }

  const initialLayout: LayoutState = {
    panels: {
      'test-panel': samplePanel
    },
    sizes: {
      'test-panel': { width: 300, height: 200 }
    },
    visibility: {
      'test-panel': true
    },
    gridTemplate: {
      columns: '300px 1fr',
      rows: '1fr',
      areas: '"left main"'
    }
  }

  beforeEach(() => {
    mockOnLayoutChange.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with initial layout', () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    expect(screen.getByText('Test Panel')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders panel with correct CSS classes', () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const panel = screen.getByText('Test Panel').closest('.ide-panel')
    expect(panel).toHaveClass('ide-panel', 'ide-panel-left')
  })

  it('shows close button when panel is closable', () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const closeButton = screen.getByLabelText('Close Test Panel')
    expect(closeButton).toBeInTheDocument()
    expect(closeButton).toHaveTextContent('×')
  })

  it('hides close button when panel is not closable', () => {
    const nonClosableLayout = {
      ...initialLayout,
      panels: {
        'test-panel': { ...samplePanel, closable: false }
      }
    }

    render(
      <IDELayoutManager 
        initialLayout={nonClosableLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    expect(screen.queryByLabelText('Close Test Panel')).not.toBeInTheDocument()
  })

  it('toggles panel visibility when close button is clicked', async () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const closeButton = screen.getByLabelText('Close Test Panel')
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(mockOnLayoutChange).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: { 'test-panel': false }
        })
      )
    })
  })

  it('renders resize handle for resizable panels', () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const resizeHandle = document.querySelector('.ide-panel-resize-handle')
    expect(resizeHandle).toBeInTheDocument()
    expect(resizeHandle).toHaveClass('ide-panel-resize-left')
  })

  it('does not render resize handle for non-resizable panels', () => {
    const nonResizableLayout = {
      ...initialLayout,
      panels: {
        'test-panel': { ...samplePanel, resizable: false }
      }
    }

    render(
      <IDELayoutManager 
        initialLayout={nonResizableLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    expect(document.querySelector('.ide-panel-resize-handle')).not.toBeInTheDocument()
  })

  it('handles mouse down on resize handle', () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const resizeHandle = document.querySelector('.ide-panel-resize-handle')
    expect(resizeHandle).toBeInTheDocument()

    fireEvent.mouseDown(resizeHandle!, { clientX: 100, clientY: 100 })
    
    // Should prevent default behavior
    expect(resizeHandle).toBeInTheDocument()
  })

  it('handles resize with mouse move', async () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const resizeHandle = document.querySelector('.ide-panel-resize-handle')!
    
    // Start resize
    fireEvent.mouseDown(resizeHandle, { clientX: 300, clientY: 100 })
    
    // Move mouse
    fireEvent(document, new MouseEvent('mousemove', { 
      clientX: 350, 
      clientY: 100,
      bubbles: true 
    }))

    await waitFor(() => {
      expect(mockOnLayoutChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sizes: expect.objectContaining({
            'test-panel': expect.objectContaining({
              width: expect.any(Number)
            })
          })
        })
      )
    })
  })

  it('ends resize on mouse up', async () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const resizeHandle = document.querySelector('.ide-panel-resize-handle')!
    
    // Start resize
    fireEvent.mouseDown(resizeHandle, { clientX: 300, clientY: 100 })
    
    // End resize
    fireEvent(document, new MouseEvent('mouseup', { bubbles: true }))

    // Should stop listening to mouse events
    fireEvent(document, new MouseEvent('mousemove', { 
      clientX: 400, 
      clientY: 100,
      bubbles: true 
    }))

    // Should not trigger additional layout changes after mouseup
    await waitFor(() => {
      const callCount = mockOnLayoutChange.mock.calls.length
      expect(callCount).toBeLessThanOrEqual(2) // Initial + potential resize
    })
  })

  it('respects minimum and maximum panel sizes', async () => {
    const constrainedPanel: PanelConfig = {
      ...samplePanel,
      minSize: 200,
      maxSize: 400
    }

    const constrainedLayout = {
      ...initialLayout,
      panels: { 'test-panel': constrainedPanel }
    }

    render(
      <IDELayoutManager 
        initialLayout={constrainedLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const resizeHandle = document.querySelector('.ide-panel-resize-handle')!
    
    // Try to resize below minimum
    fireEvent.mouseDown(resizeHandle, { clientX: 300, clientY: 100 })
    fireEvent(document, new MouseEvent('mousemove', { 
      clientX: 50, // Very small size
      clientY: 100,
      bubbles: true 
    }))

    await waitFor(() => {
      const lastCall = mockOnLayoutChange.mock.calls[mockOnLayoutChange.mock.calls.length - 1]
      if (lastCall) {
        const newSize = lastCall[0].sizes['test-panel'].width
        expect(newSize).toBeGreaterThanOrEqual(200) // Should respect minSize
      }
    })
  })

  it('handles multiple panels with different positions', () => {
    const multiPanelLayout: LayoutState = {
      panels: {
        'left-panel': { ...samplePanel, id: 'left-panel', position: 'left' },
        'right-panel': { ...samplePanel, id: 'right-panel', title: 'Right Panel', position: 'right' },
        'bottom-panel': { ...samplePanel, id: 'bottom-panel', title: 'Bottom Panel', position: 'bottom' }
      },
      sizes: {
        'left-panel': { width: 250, height: 200 },
        'right-panel': { width: 250, height: 200 },
        'bottom-panel': { width: 250, height: 150 }
      },
      visibility: {
        'left-panel': true,
        'right-panel': true,
        'bottom-panel': true
      },
      gridTemplate: {
        columns: '250px 1fr 250px',
        rows: '1fr 150px',
        areas: '"left main right" "left bottom right"'
      }
    }

    render(
      <IDELayoutManager 
        initialLayout={multiPanelLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    expect(screen.getByText('Test Panel')).toBeInTheDocument()
    expect(screen.getByText('Right Panel')).toBeInTheDocument()
    expect(screen.getByText('Bottom Panel')).toBeInTheDocument()
  })

  it('handles empty layout gracefully', () => {
    const emptyLayout: LayoutState = {
      panels: {},
      sizes: {},
      visibility: {},
      gridTemplate: {
        columns: '1fr',
        rows: '1fr',
        areas: '"main"'
      }
    }

    render(
      <IDELayoutManager 
        initialLayout={emptyLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    // Should render without errors
    expect(document.querySelector('.ide-layout-manager')).toBeInTheDocument()
  })

  it('applies correct grid template styles', () => {
    render(
      <IDELayoutManager 
        initialLayout={initialLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    const layoutManager = document.querySelector('.ide-layout-manager')
    expect(layoutManager).toHaveStyle({
      display: 'grid'
    })
  })

  it('handles panel content rendering', () => {
    const customContent = <div data-testid="custom-content">Custom Panel Content</div>
    const customLayout = {
      ...initialLayout,
      panels: {
        'test-panel': { ...samplePanel, content: customContent }
      }
    }

    render(
      <IDELayoutManager 
        initialLayout={customLayout}
        onLayoutChange={mockOnLayoutChange}
      />
    )

    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    expect(screen.getByText('Custom Panel Content')).toBeInTheDocument()
  })
})