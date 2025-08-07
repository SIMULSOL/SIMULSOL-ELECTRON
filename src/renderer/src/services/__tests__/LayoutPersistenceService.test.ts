import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LayoutPersistenceService from '../LayoutPersistenceService'
import { LayoutState } from '../../components/layout/IDELayoutManager'

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

// Mock window.electron
const mockElectron = {
  ipcRenderer: {
    invoke: vi.fn()
  }
}
Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true
})

// Mock URL and Blob for file operations
global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn()
} as any

global.Blob = vi.fn(() => ({})) as any

describe('LayoutPersistenceService', () => {
  let service: LayoutPersistenceService
  const mockLayout: LayoutState = {
    panels: {
      'test-panel': {
        id: 'test-panel',
        title: 'Test Panel',
        content: null,
        position: 'left'
      }
    },
    sizes: {
      'test-panel': { width: 250, height: 200 }
    },
    visibility: {
      'test-panel': true
    },
    gridTemplate: {
      columns: '250px 1fr',
      rows: '1fr',
      areas: '"left main"'
    }
  }

  beforeEach(() => {
    service = new LayoutPersistenceService({
      storageKey: 'test-layout',
      autoSave: true,
      saveInterval: 100
    })
    
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    mockElectron.ipcRenderer.invoke.mockClear()
  })

  afterEach(() => {
    service.destroy()
    vi.clearAllMocks()
  })

  describe('saveLayout', () => {
    it('saves layout to localStorage', async () => {
      await service.saveLayout(mockLayout)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-layout',
        JSON.stringify(mockLayout, null, 2)
      )
    })

    it('saves layout to main process via IPC', async () => {
      mockElectron.ipcRenderer.invoke.mockResolvedValue(undefined)

      await service.saveLayout(mockLayout)

      expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith(
        'workspace:save-layout',
        {
          key: 'test-layout',
          layout: mockLayout
        }
      )
    })

    it('handles localStorage errors', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      await expect(service.saveLayout(mockLayout)).rejects.toThrow(
        'Layout save failed: Storage quota exceeded'
      )
    })

    it('continues if IPC fails but localStorage succeeds', async () => {
      mockElectron.ipcRenderer.invoke.mockRejectedValue(new Error('IPC failed'))

      await expect(service.saveLayout(mockLayout)).resolves.toBeUndefined()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('loadLayout', () => {
    it('loads layout from main process first', async () => {
      mockElectron.ipcRenderer.invoke.mockResolvedValue(mockLayout)

      const result = await service.loadLayout()

      expect(result).toEqual(mockLayout)
      expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith(
        'workspace:load-layout',
        { key: 'test-layout' }
      )
      expect(localStorageMock.getItem).not.toHaveBeenCalled()
    })

    it('falls back to localStorage if main process fails', async () => {
      mockElectron.ipcRenderer.invoke.mockRejectedValue(new Error('IPC failed'))
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLayout))

      const result = await service.loadLayout()

      expect(result).toEqual(mockLayout)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-layout')
    })

    it('returns null if no saved layout exists', async () => {
      mockElectron.ipcRenderer.invoke.mockResolvedValue(null)
      localStorageMock.getItem.mockReturnValue(null)

      const result = await service.loadLayout()

      expect(result).toBeNull()
    })

    it('handles corrupted localStorage data', async () => {
      mockElectron.ipcRenderer.invoke.mockResolvedValue(null)
      localStorageMock.getItem.mockReturnValue('invalid-json')

      const result = await service.loadLayout()

      expect(result).toBeNull()
    })

    it('works without electron IPC', async () => {
      // Temporarily remove electron
      const originalElectron = window.electron
      delete (window as any).electron

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockLayout))

      const result = await service.loadLayout()

      expect(result).toEqual(mockLayout)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-layout')

      // Restore electron
      ;(window as any).electron = originalElectron
    })
  })

  describe('scheduleSave', () => {
    it('schedules save with debouncing', async () => {
      const saveSpy = vi.spyOn(service, 'saveLayout').mockResolvedValue()

      service.scheduleSave(mockLayout)
      service.scheduleSave(mockLayout) // Second call should cancel first

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(saveSpy).toHaveBeenCalledWith(mockLayout)
    })

    it('does not schedule save when autoSave is false', async () => {
      const noAutoSaveService = new LayoutPersistenceService({
        storageKey: 'test',
        autoSave: false
      })

      const saveSpy = vi.spyOn(noAutoSaveService, 'saveLayout').mockResolvedValue()

      noAutoSaveService.scheduleSave(mockLayout)

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(saveSpy).not.toHaveBeenCalled()

      noAutoSaveService.destroy()
    })
  })

  describe('clearPendingSave', () => {
    it('clears pending save timer', async () => {
      const saveSpy = vi.spyOn(service, 'saveLayout').mockResolvedValue()

      service.scheduleSave(mockLayout)
      service.clearPendingSave()

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(saveSpy).not.toHaveBeenCalled()
    })
  })

  describe('flushPendingSave', () => {
    it('immediately saves pending layout', async () => {
      const saveSpy = vi.spyOn(service, 'saveLayout').mockResolvedValue()

      service.scheduleSave(mockLayout)
      await service.flushPendingSave()

      expect(saveSpy).toHaveBeenCalledWith(mockLayout)
    })

    it('does nothing if no pending save', async () => {
      const saveSpy = vi.spyOn(service, 'saveLayout').mockResolvedValue()

      await service.flushPendingSave()

      expect(saveSpy).not.toHaveBeenCalled()
    })
  })

  describe('exportLayout', () => {
    it('creates download link for layout export', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any)

      await service.exportLayout(mockLayout, 'test-layout.json')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe('mock-url')
      expect(mockLink.download).toBe('test-layout.json')
      expect(mockLink.click).toHaveBeenCalled()
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink)
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink)
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url')
    })

    it('uses default filename if none provided', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any)
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any)

      await service.exportLayout(mockLayout)

      expect(mockLink.download).toMatch(/^ide-layout-\d+\.json$/)
    })
  })

  describe('resetLayout', () => {
    it('removes layout from localStorage and main process', async () => {
      mockElectron.ipcRenderer.invoke.mockResolvedValue(undefined)

      await service.resetLayout()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-layout')
      expect(mockElectron.ipcRenderer.invoke).toHaveBeenCalledWith(
        'workspace:reset-layout',
        { key: 'test-layout' }
      )
    })

    it('handles errors gracefully', async () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Remove failed')
      })

      await expect(service.resetLayout()).rejects.toThrow(
        'Layout reset failed: Remove failed'
      )
    })
  })

  describe('getLayoutPresets', () => {
    it('returns predefined layout presets', () => {
      const presets = service.getLayoutPresets()

      expect(presets).toHaveProperty('default')
      expect(presets).toHaveProperty('full-width')
      expect(presets).toHaveProperty('three-column')
      expect(presets).toHaveProperty('bottom-panel')

      expect(presets.default).toHaveProperty('gridTemplate')
      expect(presets['full-width'].gridTemplate.columns).toBe('1fr')
    })
  })

  describe('applyPreset', () => {
    it('applies known preset and saves it', async () => {
      const saveSpy = vi.spyOn(service, 'saveLayout').mockResolvedValue()

      const result = await service.applyPreset('full-width')

      expect(saveSpy).toHaveBeenCalledWith(result)
      expect(result.gridTemplate.columns).toBe('1fr')
    })

    it('throws error for unknown preset', async () => {
      await expect(service.applyPreset('unknown-preset')).rejects.toThrow(
        'Unknown layout preset: unknown-preset'
      )
    })
  })

  describe('destroy', () => {
    it('clears pending saves on destroy', () => {
      const clearSpy = vi.spyOn(service, 'clearPendingSave')

      service.destroy()

      expect(clearSpy).toHaveBeenCalled()
    })
  })
})