import React, { useCallback, useRef, useEffect, useState } from 'react'
import { useLayout } from './LayoutContext'
import './IDELayoutManager.css'

export interface PanelConfig {
  id: string
  title: string
  position: 'left' | 'right' | 'bottom' | 'center'
  size?: number // Size in pixels or percentage
  minSize?: number
  maxSize?: number
  resizable?: boolean
  closable?: boolean
}

export interface PanelSize {
  width?: number
  height?: number
}

export interface LayoutState {
  panels: Record<string, PanelConfig>
  sizes: Record<string, PanelSize>
  visibility: Record<string, boolean>
  gridTemplate: {
    columns: string
    rows: string
    areas: string
  }
}

interface IDELayoutManagerProps {
  initialLayout?: LayoutState
  onLayoutChange?: (layout: LayoutState) => void
  componentRegistry?: Record<string, React.ComponentType<any>>
  componentProps?: Record<string, unknown>
}

const DEFAULT_LAYOUT: LayoutState = {
  panels: {},
  sizes: {},
  visibility: {},
  gridTemplate: {
    columns: '250px 1fr',
    rows: '40px 1fr 200px',
    areas: `
      "toolbar toolbar"
      "sidebar main"
      "sidebar bottom"
    `
  }
}

export const IDELayoutManager: React.FC<IDELayoutManagerProps> = ({
  onLayoutChange,
  componentRegistry = {},
  componentProps = {}
}) => {
  const { layout, resizePanel, togglePanel } = useLayout()
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const initialSizes = useRef<Record<string, PanelSize>>({})

  const handleResizeStart = useCallback((panelId: string, event: React.MouseEvent) => {
    event.preventDefault()
    setIsResizing(panelId)
    resizeStartPos.current = { x: event.clientX, y: event.clientY }
    initialSizes.current = { ...layout.sizes }
  }, [layout.sizes])

  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (!isResizing) return

    const deltaX = event.clientX - resizeStartPos.current.x
    const deltaY = event.clientY - resizeStartPos.current.y
    
    const panel = layout.panels[isResizing]
    if (!panel) return

    const currentSize = initialSizes.current[isResizing] || { width: 250, height: 200 }
    const newSize: PanelSize = {}

    if (panel.position === 'left' || panel.position === 'right') {
      newSize.width = Math.max(
        panel.minSize || 100,
        Math.min(
          panel.maxSize || 800,
          (currentSize.width || 250) + (panel.position === 'left' ? deltaX : -deltaX)
        )
      )
    }

    if (panel.position === 'bottom') {
      newSize.height = Math.max(
        panel.minSize || 100,
        Math.min(
          panel.maxSize || 600,
          (currentSize.height || 200) - deltaY
        )
      )
    }

    resizePanel(isResizing, newSize)
  }, [isResizing, layout.panels, resizePanel])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(null)
    initialSizes.current = {}
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Notify parent of layout changes
  useEffect(() => {
    if (onLayoutChange) {
      onLayoutChange(layout)
    }
  }, [layout, onLayoutChange])

  // Update grid template based on panel sizes and visibility
  const updateGridTemplate = useCallback(() => {
    const leftPanel = Object.values(layout.panels).find(p => p.position === 'left')
    const rightPanel = Object.values(layout.panels).find(p => p.position === 'right')
    const bottomPanel = Object.values(layout.panels).find(p => p.position === 'bottom')

    const leftVisible = leftPanel && layout.visibility[leftPanel.id]
    const rightVisible = rightPanel && layout.visibility[rightPanel.id]
    const bottomVisible = bottomPanel && layout.visibility[bottomPanel.id]

    const leftWidth = leftVisible ? `${layout.sizes[leftPanel!.id]?.width || 250}px` : '0px'
    const rightWidth = rightVisible ? `${layout.sizes[rightPanel!.id]?.width || 250}px` : '0px'
    const bottomHeight = bottomVisible ? `${layout.sizes[bottomPanel!.id]?.height || 200}px` : '0px'

    let columns = '1fr'
    let areas = '"main"'

    if (leftVisible && rightVisible) {
      columns = `${leftWidth} 1fr ${rightWidth}`
      areas = bottomVisible 
        ? `"left main right" "left bottom right"`
        : `"left main right"`
    } else if (leftVisible) {
      columns = `${leftWidth} 1fr`
      areas = bottomVisible 
        ? `"left main" "left bottom"`
        : `"left main"`
    } else if (rightVisible) {
      columns = `1fr ${rightWidth}`
      areas = bottomVisible 
        ? `"main right" "bottom right"`
        : `"main right"`
    } else {
      areas = bottomVisible ? `"main" "bottom"` : `"main"`
    }

    const rows = bottomVisible ? `1fr ${bottomHeight}` : '1fr'

    return {
      columns,
      rows,
      areas
    }
  }, [layout])

  const gridTemplate = updateGridTemplate()

  return (
    <div 
      ref={containerRef}
      className="ide-layout-manager"
      style={{
        gridTemplateColumns: gridTemplate.columns,
        gridTemplateRows: gridTemplate.rows,
        gridTemplateAreas: gridTemplate.areas
      }}
    >
      {Object.entries(layout.panels).map(([panelId, panel]) => {
        if (!layout.visibility[panelId]) return null

        return (
          <div
            key={panelId}
            className={`ide-panel ide-panel-${panel.position}`}
            style={{ gridArea: panel.position === 'center' ? 'main' : panel.position }}
          >
            <div className="ide-panel-header">
              <span className="ide-panel-title">{panel.title}</span>
              <div className="ide-panel-controls">
                {panel.closable !== false && (
                  <button
                    className="ide-panel-close"
                    onClick={() => togglePanel(panelId)}
                    aria-label={`Close ${panel.title}`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="ide-panel-content">
              {(() => {
                const Component = componentRegistry[panelId]
                if (Component) {
                  const props = componentProps[panelId] || {}
                  return <Component {...props} />
                }
                return <div>Panel content not found for {panelId}</div>
              })()}
            </div>
            {panel.resizable !== false && (
              <div
                className={`ide-panel-resize-handle ide-panel-resize-${panel.position}`}
                onMouseDown={(e) => handleResizeStart(panelId, e)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Export the hook for external use - now uses context
export const useIDELayout = () => {
  return useLayout()
}

export default IDELayoutManager