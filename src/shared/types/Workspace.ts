// Workspace and session management types

import { Position } from './Common'

export interface WorkspaceState {
  activeProject: string
  openFiles: OpenFile[]
  layout: LayoutState
  terminalSessions: TerminalSession[]
  preferences: UserPreferences
  recentProjects: string[]
}

export interface OpenFile {
  path: string
  content: string
  isDirty: boolean
  cursorPosition: Position
  scrollPosition: number
  isActive: boolean
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

export type PanelType = 'editor' | 'terminal' | 'explorer' | 'output' | 'problems' | 'test'

export interface PanelSize {
  width: number
  height: number
}

export interface PanelPosition {
  x: number
  y: number
}

export interface TerminalSession {
  id: string
  name: string
  cwd: string
  isActive: boolean
  history: string[]
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  fontSize: number
  fontFamily: string
  tabSize: number
  wordWrap: boolean
  autoSave: boolean
  autoSaveDelay: number
  showWhitespace: boolean
  showLineNumbers: boolean
}

export interface WorkspaceInfo {
  name: string
  path: string
  lastOpened: Date
  projectType: string
}