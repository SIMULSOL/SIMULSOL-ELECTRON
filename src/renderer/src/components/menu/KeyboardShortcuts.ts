export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: string
  description: string
  category: string
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // File operations
  {
    key: 'n',
    ctrlKey: true,
    action: 'file.new.file',
    description: 'New File',
    category: 'File'
  },
  {
    key: 'n',
    ctrlKey: true,
    shiftKey: true,
    action: 'file.new.project',
    description: 'New Project',
    category: 'File'
  },
  {
    key: 'o',
    ctrlKey: true,
    action: 'file.open.project',
    description: 'Open Project',
    category: 'File'
  },
  {
    key: 'o',
    ctrlKey: true,
    shiftKey: true,
    action: 'file.open.file',
    description: 'Open File',
    category: 'File'
  },
  {
    key: 's',
    ctrlKey: true,
    action: 'file.save',
    description: 'Save File',
    category: 'File'
  },
  {
    key: 's',
    ctrlKey: true,
    shiftKey: true,
    action: 'file.save.as',
    description: 'Save As',
    category: 'File'
  },
  {
    key: 'w',
    ctrlKey: true,
    action: 'file.close',
    description: 'Close File',
    category: 'File'
  },
  {
    key: 'w',
    ctrlKey: true,
    shiftKey: true,
    action: 'file.close.project',
    description: 'Close Project',
    category: 'File'
  },

  // Edit operations
  {
    key: 'z',
    ctrlKey: true,
    action: 'edit.undo',
    description: 'Undo',
    category: 'Edit'
  },
  {
    key: 'y',
    ctrlKey: true,
    action: 'edit.redo',
    description: 'Redo',
    category: 'Edit'
  },
  {
    key: 'x',
    ctrlKey: true,
    action: 'edit.cut',
    description: 'Cut',
    category: 'Edit'
  },
  {
    key: 'c',
    ctrlKey: true,
    action: 'edit.copy',
    description: 'Copy',
    category: 'Edit'
  },
  {
    key: 'v',
    ctrlKey: true,
    action: 'edit.paste',
    description: 'Paste',
    category: 'Edit'
  },
  {
    key: 'f',
    ctrlKey: true,
    action: 'edit.find',
    description: 'Find',
    category: 'Edit'
  },
  {
    key: 'h',
    ctrlKey: true,
    action: 'edit.replace',
    description: 'Replace',
    category: 'Edit'
  },
  {
    key: 'f',
    ctrlKey: true,
    shiftKey: true,
    action: 'edit.find.files',
    description: 'Find in Files',
    category: 'Edit'
  },

  // View operations
  {
    key: 'e',
    ctrlKey: true,
    shiftKey: true,
    action: 'view.explorer',
    description: 'Toggle Explorer',
    category: 'View'
  },
  {
    key: '`',
    ctrlKey: true,
    action: 'view.terminal',
    description: 'Toggle Terminal',
    category: 'View'
  },
  {
    key: 'u',
    ctrlKey: true,
    shiftKey: true,
    action: 'view.output',
    description: 'Toggle Output',
    category: 'View'
  },
  {
    key: '=',
    ctrlKey: true,
    action: 'view.zoom.in',
    description: 'Zoom In',
    category: 'View'
  },
  {
    key: '-',
    ctrlKey: true,
    action: 'view.zoom.out',
    description: 'Zoom Out',
    category: 'View'
  },
  {
    key: '0',
    ctrlKey: true,
    action: 'view.zoom.reset',
    description: 'Reset Zoom',
    category: 'View'
  },
  {
    key: 'F11',
    action: 'view.fullscreen',
    description: 'Toggle Fullscreen',
    category: 'View'
  },

  // Build operations
  {
    key: 'b',
    ctrlKey: true,
    shiftKey: true,
    action: 'build.build',
    description: 'Build Project',
    category: 'Build'
  },
  {
    key: 'r',
    ctrlKey: true,
    shiftKey: true,
    action: 'build.rebuild',
    description: 'Rebuild Project',
    category: 'Build'
  },
  {
    key: 'c',
    ctrlKey: true,
    shiftKey: true,
    action: 'build.clean',
    description: 'Clean Project',
    category: 'Build'
  },
  {
    key: 't',
    ctrlKey: true,
    action: 'build.test',
    description: 'Run Tests',
    category: 'Build'
  },
  {
    key: 't',
    ctrlKey: true,
    shiftKey: true,
    action: 'build.test.debug',
    description: 'Debug Tests',
    category: 'Build'
  },
  {
    key: 'd',
    ctrlKey: true,
    action: 'build.deploy',
    description: 'Deploy to Devnet',
    category: 'Build'
  },

  // Help
  {
    key: 'F1',
    action: 'help.docs',
    description: 'Show Documentation',
    category: 'Help'
  }
]

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private listeners: Map<string, (action: string) => void> = new Map()

  constructor() {
    this.registerShortcuts(KEYBOARD_SHORTCUTS)
    this.bindEventListeners()
  }

  private registerShortcuts(shortcuts: KeyboardShortcut[]): void {
    shortcuts.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut)
      this.shortcuts.set(key, shortcut)
    })
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts: string[] = []
    
    if (shortcut.ctrlKey) parts.push('ctrl')
    if (shortcut.shiftKey) parts.push('shift')
    if (shortcut.altKey) parts.push('alt')
    if (shortcut.metaKey) parts.push('meta')
    
    parts.push(shortcut.key.toLowerCase())
    
    return parts.join('+')
  }

  private bindEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Don't handle shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    const key = this.getEventKey(event)
    const shortcut = this.shortcuts.get(key)
    
    if (shortcut) {
      event.preventDefault()
      event.stopPropagation()
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        listener(shortcut.action)
      })
    }
  }

  private getEventKey(event: KeyboardEvent): string {
    const parts: string[] = []
    
    if (event.ctrlKey) parts.push('ctrl')
    if (event.shiftKey) parts.push('shift')
    if (event.altKey) parts.push('alt')
    if (event.metaKey) parts.push('meta')
    
    parts.push(event.key.toLowerCase())
    
    return parts.join('+')
  }

  public addListener(id: string, callback: (action: string) => void): void {
    this.listeners.set(id, callback)
  }

  public removeListener(id: string): void {
    this.listeners.delete(id)
  }

  public getShortcutForAction(action: string): KeyboardShortcut | undefined {
    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.action === action) {
        return shortcut
      }
    }
    return undefined
  }

  public getShortcutString(shortcut: KeyboardShortcut): string {
    const parts: string[] = []
    
    if (shortcut.ctrlKey) parts.push('Ctrl')
    if (shortcut.shiftKey) parts.push('Shift')
    if (shortcut.altKey) parts.push('Alt')
    if (shortcut.metaKey) parts.push('Cmd')
    
    parts.push(shortcut.key.toUpperCase())
    
    return parts.join('+')
  }

  public getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
  }

  public getShortcutsByCategory(): Record<string, KeyboardShortcut[]> {
    const categories: Record<string, KeyboardShortcut[]> = {}
    
    this.shortcuts.forEach(shortcut => {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = []
      }
      categories[shortcut.category].push(shortcut)
    })
    
    return categories
  }

  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    this.listeners.clear()
    this.shortcuts.clear()
  }
}

export default KeyboardShortcutManager