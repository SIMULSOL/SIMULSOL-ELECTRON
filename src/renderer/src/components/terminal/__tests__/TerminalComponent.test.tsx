import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import TerminalComponent from '../TerminalComponent'

// Mock xterm.js
const mockTerminal = {
  loadAddon: vi.fn(),
  open: vi.fn(),
  onData: vi.fn(),
  write: vi.fn(),
  clear: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn()
}

const mockFitAddon = {
  fit: vi.fn()
}

const mockWebLinksAddon = {}

vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(() => mockTerminal)
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => mockFitAddon)
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn(() => mockWebLinksAddon)
}))

// Mock window.api
const mockApi = {
  terminal: {
    create: vi.fn().mockResolvedValue({ terminalId: 'test-terminal', pid: 1234 }),
    sendInput: vi.fn().mockResolvedValue({ sent: true }),
    resize: vi.fn().mockResolvedValue({ resized: true }),
    close: vi.fn().mockResolvedValue({ closed: true })
  },
  events: {
    onTerminalOutput: vi.fn().mockReturnValue(() => {})
  }
}

// Mock global window object
Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})

describe('TerminalComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render terminal container', () => {
    render(<TerminalComponent />)
    
    const terminalContainer = screen.getByRole('generic')
    expect(terminalContainer).toBeInTheDocument()
    expect(terminalContainer).toHaveClass('terminal-component')
  })

  it('should create terminal session on mount', async () => {
    const onSessionCreate = vi.fn()
    
    render(
      <TerminalComponent 
        onSessionCreate={onSessionCreate}
        config={{ cwd: '/test/path' }}
      />
    )

    await waitFor(() => {
      expect(mockApi.terminal.create).toHaveBeenCalledWith('/test/path', undefined, undefined)
    })

    await waitFor(() => {
      expect(onSessionCreate).toHaveBeenCalled()
    })
  })

  it('should handle terminal configuration', async () => {
    const config = {
      theme: 'light' as const,
      fontSize: 16,
      fontFamily: 'Monaco',
      cwd: '/custom/path'
    }

    render(<TerminalComponent config={config} />)

    await waitFor(() => {
      expect(mockApi.terminal.create).toHaveBeenCalledWith('/custom/path', undefined, undefined)
    })
  })

  it('should set up terminal output listener', async () => {
    render(<TerminalComponent />)

    await waitFor(() => {
      expect(mockApi.events.onTerminalOutput).toHaveBeenCalled()
    })
  })

  it('should handle terminal data input', async () => {
    render(<TerminalComponent />)

    // Wait for terminal to be initialized
    await waitFor(() => {
      expect(mockTerminal.onData).toHaveBeenCalled()
    })

    // Simulate terminal data input
    const onDataCallback = mockTerminal.onData.mock.calls[0][0]
    onDataCallback('test input')

    await waitFor(() => {
      expect(mockApi.terminal.sendInput).toHaveBeenCalled()
    })
  })

  it('should cleanup on unmount', async () => {
    const onSessionDestroy = vi.fn()
    
    const { unmount } = render(
      <TerminalComponent onSessionDestroy={onSessionDestroy} />
    )

    // Wait for initialization
    await waitFor(() => {
      expect(mockApi.terminal.create).toHaveBeenCalled()
    })

    unmount()

    expect(mockApi.terminal.close).toHaveBeenCalled()
    expect(mockTerminal.dispose).toHaveBeenCalled()
    expect(onSessionDestroy).toHaveBeenCalled()
  })

  it('should handle resize events', async () => {
    render(<TerminalComponent />)

    // Wait for initialization
    await waitFor(() => {
      expect(mockTerminal.onData).toHaveBeenCalled()
    })

    // Simulate window resize
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(mockFitAddon.fit).toHaveBeenCalled()
    })
  })

  it('should apply theme configuration', () => {
    const lightConfig = { theme: 'light' as const }
    render(<TerminalComponent config={lightConfig} />)

    // Terminal should be created with light theme colors
    expect(mockTerminal.loadAddon).toHaveBeenCalled()
  })

  it('should handle output callback', async () => {
    const onOutput = vi.fn()
    
    render(<TerminalComponent onOutput={onOutput} />)

    // Wait for terminal to be initialized
    await waitFor(() => {
      expect(mockTerminal.onData).toHaveBeenCalled()
    })

    // Simulate terminal data input
    const onDataCallback = mockTerminal.onData.mock.calls[0][0]
    onDataCallback('test output')

    expect(onOutput).toHaveBeenCalledWith('test output')
  })
})