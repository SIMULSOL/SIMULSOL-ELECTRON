// Renderer process UI types

import { PanelType, PanelSize, PanelPosition } from '../../../shared/types/Workspace'

export interface IDELayoutManager {
  initializeLayout(): void
  addPanel(panel: PanelConfig): void
  removePanel(panelId: string): void
  resizePanel(panelId: string, size: PanelSize): void
  saveLayout(): LayoutState
  restoreLayout(layout: LayoutState): void
}

export interface PanelConfig {
  id: string
  type: PanelType
  title: string
  component: React.ComponentType<any>
  defaultSize: PanelSize
  defaultPosition: PanelPosition
  closable: boolean
  resizable: boolean
}

export interface LayoutState {
  panels: PanelState[]
  splitterPositions: Record<string, number>
  activePanel: string
  sidebarWidth: number
  bottomPanelHeight: number
}

export interface PanelState {
  id: string
  type: PanelType
  visible: boolean
  size: PanelSize
  position: PanelPosition
}

export interface MenuConfig {
  id: string
  label: string
  accelerator?: string
  click?: () => void
  submenu?: MenuConfig[]
  type?: 'normal' | 'separator' | 'checkbox' | 'radio'
  checked?: boolean
  enabled?: boolean
}

export interface ToolbarConfig {
  id: string
  items: ToolbarItem[]
}

export interface ToolbarItem {
  id: string
  type: 'button' | 'separator' | 'dropdown'
  icon?: string
  label?: string
  tooltip?: string
  click?: () => void
  enabled?: boolean
  items?: ToolbarItem[]
}

export interface StatusBarConfig {
  left: StatusBarItem[]
  right: StatusBarItem[]
}

export interface StatusBarItem {
  id: string
  text: string
  tooltip?: string
  click?: () => void
  priority: number
}

export interface NotificationConfig {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  duration?: number
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
}