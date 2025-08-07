import { LayoutState } from '../components/layout/IDELayoutManager'

export interface LayoutPersistenceOptions {
  storageKey: string
  autoSave: boolean
  saveInterval?: number
}

export class LayoutPersistenceService {
  private options: LayoutPersistenceOptions
  private saveTimer: NodeJS.Timeout | null = null
  private pendingLayout: LayoutState | null = null

  constructor(options: LayoutPersistenceOptions) {
    this.options = {
      saveInterval: 1000, // Default 1 second
      ...options
    }
  }

  /**
   * Save layout state to localStorage
   */
  async saveLayout(layout: LayoutState): Promise<void> {
    try {
      const serialized = JSON.stringify(layout, null, 2)
      localStorage.setItem(this.options.storageKey, serialized)
      
      // Also save to IPC for main process persistence
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('workspace:save-layout', {
          key: this.options.storageKey,
          layout
        })
      }
    } catch (error) {
      console.error('Failed to save layout:', error)
      throw new Error(`Layout save failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Load layout state from localStorage
   */
  async loadLayout(): Promise<LayoutState | null> {
    try {
      // Try to load from main process first
      if (window.electron?.ipcRenderer) {
        try {
          const mainLayout = await window.electron.ipcRenderer.invoke('workspace:load-layout', {
            key: this.options.storageKey
          })
          if (mainLayout) {
            return mainLayout
          }
        } catch (error) {
          console.warn('Failed to load layout from main process:', error)
        }
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(this.options.storageKey)
      if (saved) {
        return JSON.parse(saved) as LayoutState
      }
      
      return null
    } catch (error) {
      console.error('Failed to load layout:', error)
      return null
    }
  }

  /**
   * Schedule layout save with debouncing
   */
  scheduleSave(layout: LayoutState): void {
    if (!this.options.autoSave) {
      return
    }

    this.pendingLayout = layout

    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.saveTimer = setTimeout(() => {
      if (this.pendingLayout) {
        this.saveLayout(this.pendingLayout).catch(error => {
          console.error('Scheduled layout save failed:', error)
        })
        this.pendingLayout = null
      }
      this.saveTimer = null
    }, this.options.saveInterval)
  }

  /**
   * Clear any pending saves
   */
  clearPendingSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    this.pendingLayout = null
  }

  /**
   * Force immediate save of pending layout
   */
  async flushPendingSave(): Promise<void> {
    if (this.pendingLayout) {
      await this.saveLayout(this.pendingLayout)
      this.clearPendingSave()
    }
  }

  /**
   * Export layout to file
   */
  async exportLayout(layout: LayoutState, filename?: string): Promise<void> {
    try {
      const serialized = JSON.stringify(layout, null, 2)
      const blob = new Blob([serialized], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `ide-layout-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export layout:', error)
      throw new Error(`Layout export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Import layout from file
   */
  async importLayout(): Promise<LayoutState | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string
            const layout = JSON.parse(content) as LayoutState
            resolve(layout)
          } catch (error) {
            reject(new Error(`Invalid layout file: ${error instanceof Error ? error.message : 'Unknown error'}`))
          }
        }
        reader.onerror = () => reject(new Error('Failed to read layout file'))
        reader.readAsText(file)
      }
      
      input.click()
    })
  }

  /**
   * Reset layout to default state
   */
  async resetLayout(): Promise<void> {
    try {
      localStorage.removeItem(this.options.storageKey)
      
      if (window.electron?.ipcRenderer) {
        await window.electron.ipcRenderer.invoke('workspace:reset-layout', {
          key: this.options.storageKey
        })
      }
    } catch (error) {
      console.error('Failed to reset layout:', error)
      throw new Error(`Layout reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get available layout presets
   */
  getLayoutPresets(): Record<string, LayoutState> {
    return {
      'default': {
        panels: {},
        sizes: {},
        visibility: {},
        gridTemplate: {
          columns: '250px 1fr',
          rows: '1fr',
          areas: '"sidebar main"'
        }
      },
      'full-width': {
        panels: {},
        sizes: {},
        visibility: {},
        gridTemplate: {
          columns: '1fr',
          rows: '1fr',
          areas: '"main"'
        }
      },
      'three-column': {
        panels: {},
        sizes: {},
        visibility: {},
        gridTemplate: {
          columns: '200px 1fr 200px',
          rows: '1fr',
          areas: '"left main right"'
        }
      },
      'bottom-panel': {
        panels: {},
        sizes: {},
        visibility: {},
        gridTemplate: {
          columns: '250px 1fr',
          rows: '1fr 200px',
          areas: '"sidebar main" "sidebar bottom"'
        }
      }
    }
  }

  /**
   * Apply a layout preset
   */
  async applyPreset(presetName: string): Promise<LayoutState> {
    const presets = this.getLayoutPresets()
    const preset = presets[presetName]
    
    if (!preset) {
      throw new Error(`Unknown layout preset: ${presetName}`)
    }

    await this.saveLayout(preset)
    return preset
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearPendingSave()
  }
}

export default LayoutPersistenceService