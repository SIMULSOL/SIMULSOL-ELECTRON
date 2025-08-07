// Renderer process layout types

export interface LayoutManager {
  initialize(): void
  addPanel(config: PanelConfig): void
  removePanel(id: string): void
  showPanel(id: string): void
  hidePanel(id: string): void
  resizePanel(id: string, size: PanelSize): void
  movePanel(id: string, position: PanelPosition): void
  saveLayout(): LayoutSnapshot
  restoreLayout(snapshot: LayoutSnapshot): void
}

export interface PanelConfig {
  id: string
  type: PanelType
  title: string
  component: React.ComponentType<PanelProps>
  defaultSize: PanelSize
  defaultPosition: PanelPosition
  minSize?: PanelSize
  maxSize?: PanelSize
  closable: boolean
  resizable: boolean
  movable: boolean
}

export interface PanelProps {
  id: string
  size: PanelSize
  position: PanelPosition
  isActive: boolean
  onResize?: (size: PanelSize) => void
  onMove?: (position: PanelPosition) => void
  onClose?: () => void
}

export type PanelType = 
  | 'editor' 
  | 'terminal' 
  | 'explorer' 
  | 'output' 
  | 'problems' 
  | 'test' 
  | 'debug' 
  | 'search'

export interface PanelSize {
  width: number
  height: number
}

export interface PanelPosition {
  x: number
  y: number
  dock?: 'left' | 'right' | 'top' | 'bottom' | 'center'
}

export interface LayoutSnapshot {
  version: string
  timestamp: Date
  panels: PanelSnapshot[]
  splitters: SplitterSnapshot[]
  activePanel: string
}

export interface PanelSnapshot {
  id: string
  type: PanelType
  title: string
  size: PanelSize
  position: PanelPosition
  visible: boolean
  zIndex: number
}

export interface SplitterSnapshot {
  id: string
  orientation: 'horizontal' | 'vertical'
  position: number
  panels: string[]
}

export interface DockArea {
  id: string
  type: 'left' | 'right' | 'top' | 'bottom' | 'center'
  panels: string[]
  size: number
  visible: boolean
}

export interface TabGroup {
  id: string
  panels: string[]
  activePanel: string
  position: PanelPosition
  size: PanelSize
}