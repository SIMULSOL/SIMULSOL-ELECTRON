import React, { createContext, useContext, useCallback, useState, useEffect } from 'react'
import { PanelConfig, PanelSize, LayoutState } from './IDELayoutManager'

interface LayoutContextType {
  layout: LayoutState
  addPanel: (panel: PanelConfig) => void
  removePanel: (panelId: string) => void
  resizePanel: (panelId: string, size: PanelSize) => void
  togglePanel: (panelId: string) => void
  saveLayout: () => LayoutState
  restoreLayout: (layout: LayoutState) => void
  isLayoutReady: boolean
}

const LayoutContext = createContext<LayoutContextType | null>(null)

interface LayoutProviderProps {
  children: React.ReactNode
  persistKey?: string
  onLayoutChange?: (layout: LayoutState) => void
}

const DEFAULT_LAYOUT: LayoutState = {
  panels: {},
  sizes: {},
  visibility: {},
  gridTemplate: {
    columns: '250px 1fr',
    rows: '1fr',
    areas: '"sidebar main"'
  }
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({
  children,
  persistKey = 'ide-layout',
  onLayoutChange
}) => {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT)
  const [isLayoutReady, setIsLayoutReady] = useState(false)

  // Load persisted layout on mount
  useEffect(() => {
    const loadPersistedLayout = () => {
      try {
        const saved = localStorage.getItem(persistKey)
        if (saved) {
          const parsedLayout = JSON.parse(saved) as LayoutState
          setLayout(parsedLayout)
        }
      } catch (error) {
        console.warn('Failed to load persisted layout:', error)
      } finally {
        setIsLayoutReady(true)
      }
    }

    loadPersistedLayout()
  }, [persistKey])

  // Persist layout changes
  useEffect(() => {
    if (isLayoutReady) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(layout))
        onLayoutChange?.(layout)
      } catch (error) {
        console.warn('Failed to persist layout:', error)
      }
    }
  }, [layout, persistKey, onLayoutChange, isLayoutReady])

  const updateLayout = useCallback((newLayout: LayoutState) => {
    setLayout(newLayout)
  }, [])

  const addPanel = useCallback((panel: PanelConfig) => {
    setLayout((prevLayout) => {
      const newLayout = {
        ...prevLayout,
        panels: {
          ...prevLayout.panels,
          [panel.id]: panel
        },
        visibility: {
          ...prevLayout.visibility,
          [panel.id]: true
        },
        sizes: {
          ...prevLayout.sizes,
          [panel.id]: {
            width: panel.size || 250,
            height: panel.size || 200
          }
        }
      }
      return newLayout
    })
  }, [])

  const removePanel = useCallback((panelId: string) => {
    setLayout((prevLayout) => {
      const newPanels = { ...prevLayout.panels }
      const newVisibility = { ...prevLayout.visibility }
      const newSizes = { ...prevLayout.sizes }

      delete newPanels[panelId]
      delete newVisibility[panelId]
      delete newSizes[panelId]

      return {
        ...prevLayout,
        panels: newPanels,
        visibility: newVisibility,
        sizes: newSizes
      }
    })
  }, [])

  const resizePanel = useCallback((panelId: string, size: PanelSize) => {
    setLayout((prevLayout) => ({
      ...prevLayout,
      sizes: {
        ...prevLayout.sizes,
        [panelId]: {
          ...prevLayout.sizes[panelId],
          ...size
        }
      }
    }))
  }, [])

  const togglePanel = useCallback((panelId: string) => {
    setLayout((prevLayout) => ({
      ...prevLayout,
      visibility: {
        ...prevLayout.visibility,
        [panelId]: !prevLayout.visibility[panelId]
      }
    }))
  }, [])

  const saveLayout = useCallback((): LayoutState => {
    return { ...layout }
  }, [layout])

  const restoreLayout = useCallback((savedLayout: LayoutState) => {
    setLayout(savedLayout)
  }, [])

  const contextValue: LayoutContextType = {
    layout,
    addPanel,
    removePanel,
    resizePanel,
    togglePanel,
    saveLayout,
    restoreLayout,
    isLayoutReady
  }

  return <LayoutContext.Provider value={contextValue}>{children}</LayoutContext.Provider>
}

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

export default LayoutProvider
