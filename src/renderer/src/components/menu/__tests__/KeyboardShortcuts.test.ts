import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import KeyboardShortcutManager, { KEYBOARD_SHORTCUTS } from '../KeyboardShortcuts'

describe('KeyboardShortcutManager', () => {
  let manager: KeyboardShortcutManager
  let mockCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    manager = new KeyboardShortcutManager()
    mockCallback = vi.fn()
    manager.addListener('test', mockCallback)
  })

  afterEach(() => {
    manager.destroy()
    vi.clearAllMocks()
  })

  it('initializes with default shortcuts', () => {
    const shortcuts = manager.getAllShortcuts()
    expect(shortcuts.length).toBe(KEYBOARD_SHORTCUTS.length)
  })

  it('triggers callback for Ctrl+S shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).toHaveBeenCalledWith('file.save')
  })

  it('triggers callback for Ctrl+Shift+N shortcut', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).toHaveBeenCalledWith('file.new.project')
  })

  it('does not trigger for non-matching shortcuts', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'x',
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
      bubbles: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('ignores shortcuts when typing in input fields', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    Object.defineProperty(event, 'target', {
      value: input,
      enumerable: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('ignores shortcuts when typing in textarea', () => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    Object.defineProperty(event, 'target', {
      value: textarea,
      enumerable: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).not.toHaveBeenCalled()

    document.body.removeChild(textarea)
  })

  it('ignores shortcuts in contentEditable elements', () => {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    document.body.appendChild(div)
    div.focus()

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    Object.defineProperty(event, 'target', {
      value: div,
      enumerable: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).not.toHaveBeenCalled()

    document.body.removeChild(div)
  })

  it('finds shortcut for action', () => {
    const shortcut = manager.getShortcutForAction('file.save')
    
    expect(shortcut).toBeDefined()
    expect(shortcut?.key).toBe('s')
    expect(shortcut?.ctrlKey).toBe(true)
    expect(shortcut?.action).toBe('file.save')
  })

  it('returns undefined for non-existent action', () => {
    const shortcut = manager.getShortcutForAction('non.existent.action')
    expect(shortcut).toBeUndefined()
  })

  it('formats shortcut string correctly', () => {
    const shortcut = manager.getShortcutForAction('file.save')!
    const shortcutString = manager.getShortcutString(shortcut)
    
    expect(shortcutString).toBe('Ctrl+S')
  })

  it('formats complex shortcut string correctly', () => {
    const shortcut = manager.getShortcutForAction('file.new.project')!
    const shortcutString = manager.getShortcutString(shortcut)
    
    expect(shortcutString).toBe('Ctrl+Shift+N')
  })

  it('groups shortcuts by category', () => {
    const categories = manager.getShortcutsByCategory()
    
    expect(categories).toHaveProperty('File')
    expect(categories).toHaveProperty('Edit')
    expect(categories).toHaveProperty('View')
    expect(categories).toHaveProperty('Build')
    expect(categories).toHaveProperty('Help')

    expect(categories.File.length).toBeGreaterThan(0)
    expect(categories.Edit.length).toBeGreaterThan(0)
  })

  it('adds and removes listeners correctly', () => {
    const callback2 = vi.fn()
    manager.addListener('test2', callback2)

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).toHaveBeenCalledWith('file.save')
    expect(callback2).toHaveBeenCalledWith('file.save')

    manager.removeListener('test2')
    mockCallback.mockClear()
    callback2.mockClear()

    document.dispatchEvent(event)

    expect(mockCallback).toHaveBeenCalledWith('file.save')
    expect(callback2).not.toHaveBeenCalled()
  })

  it('handles F-key shortcuts', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'F1',
      bubbles: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).toHaveBeenCalledWith('help.docs')
  })

  it('handles special key shortcuts like backtick', () => {
    const event = new KeyboardEvent('keydown', {
      key: '`',
      ctrlKey: true,
      bubbles: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).toHaveBeenCalledWith('view.terminal')
  })

  it('handles case insensitive key matching', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'S', // Uppercase
      ctrlKey: true,
      bubbles: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).toHaveBeenCalledWith('file.save')
  })

  it('prevents default behavior for matched shortcuts', () => {
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

    document.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(stopPropagationSpy).toHaveBeenCalled()
  })

  it('does not prevent default for non-matching shortcuts', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'x',
      bubbles: true
    })

    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    document.dispatchEvent(event)

    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('handles multiple listeners for same shortcut', () => {
    const callback2 = vi.fn()
    const callback3 = vi.fn()
    
    manager.addListener('test2', callback2)
    manager.addListener('test3', callback3)

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    document.dispatchEvent(event)

    expect(mockCallback).toHaveBeenCalledWith('file.save')
    expect(callback2).toHaveBeenCalledWith('file.save')
    expect(callback3).toHaveBeenCalledWith('file.save')
  })

  it('cleans up properly on destroy', () => {
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true
    })

    manager.destroy()

    document.dispatchEvent(event)

    expect(mockCallback).not.toHaveBeenCalled()
  })

  it('validates shortcut structure', () => {
    const shortcuts = manager.getAllShortcuts()
    
    shortcuts.forEach(shortcut => {
      expect(shortcut).toHaveProperty('key')
      expect(shortcut).toHaveProperty('action')
      expect(shortcut).toHaveProperty('description')
      expect(shortcut).toHaveProperty('category')
      
      expect(typeof shortcut.key).toBe('string')
      expect(typeof shortcut.action).toBe('string')
      expect(typeof shortcut.description).toBe('string')
      expect(typeof shortcut.category).toBe('string')
    })
  })

  it('has unique action IDs', () => {
    const shortcuts = manager.getAllShortcuts()
    const actions = shortcuts.map(s => s.action)
    const uniqueActions = new Set(actions)
    
    expect(actions.length).toBe(uniqueActions.size)
  })

  it('handles meta key shortcuts on Mac', () => {
    const shortcut = {
      key: 's',
      metaKey: true,
      action: 'test.meta',
      description: 'Test Meta',
      category: 'Test'
    }

    const shortcutString = manager.getShortcutString(shortcut)
    expect(shortcutString).toBe('Cmd+S')
  })
})