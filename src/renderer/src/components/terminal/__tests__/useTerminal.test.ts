import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useTerminal } from '../useTerminal'
import { TerminalSession } from '../TerminalComponent'

// Mock window.api
const mockApi = {
  terminal: {
    sendInput: vi.fn().mockResolvedValue({ sent: true }),
    resize: vi.fn().mockResolvedValue({ resized: true })
  }
}

Object.defineProperty(window, 'api', {
  value: mockApi,
  writable: true
})

// Mock terminal session
const createMockSession = (id: string): TerminalSession => ({
  id,
  terminal: {
    clear: vi.fn(),
    resize: vi.fn()
  } as any,
  isActive: false,
  title: `Terminal ${id}`
})

describe('useTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty sessions', () => {
    const { result } = renderHook(() => useTerminal())

    expect(result.current.sessions).toEqual([])
    expect(result.current.activeSessionId).toBeNull()
  })

  it('should create session ID', () => {
    const { result } = renderHook(() => useTerminal())

    act(() => {
      const sessionId = result.current.createSession()
      expect(sessionId).toMatch(/^terminal-\d+-[a-z0-9]+$/)
    })
  })

  it('should handle session creation', () => {
    const { result } = renderHook(() => useTerminal())
    const mockSession = createMockSession('test-session-1')

    act(() => {
      result.current.onSessionCreate(mockSession)
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0]).toBe(mockSession)
    expect(result.current.activeSessionId).toBe('test-session-1')
  })

  it('should handle multiple sessions', () => {
    const { result } = renderHook(() => useTerminal())
    const session1 = createMockSession('test-session-1')
    const session2 = createMockSession('test-session-2')

    act(() => {
      result.current.onSessionCreate(session1)
    })

    act(() => {
      result.current.onSessionCreate(session2)
    })

    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.activeSessionId).toBe('test-session-1') // First session remains active
  })

  it('should set active session', () => {
    const { result } = renderHook(() => useTerminal())
    const session1 = createMockSession('test-session-1')
    const session2 = createMockSession('test-session-2')

    act(() => {
      result.current.onSessionCreate(session1)
      result.current.onSessionCreate(session2)
    })

    act(() => {
      result.current.setActiveSession('test-session-2')
    })

    expect(result.current.activeSessionId).toBe('test-session-2')
    expect(result.current.sessions[0].isActive).toBe(false)
    expect(result.current.sessions[1].isActive).toBe(true)
  })

  it('should get active session', () => {
    const { result } = renderHook(() => useTerminal())
    const session1 = createMockSession('test-session-1')

    act(() => {
      result.current.onSessionCreate(session1)
    })

    const activeSession = result.current.getActiveSession()
    expect(activeSession).toBe(session1)
  })

  it('should destroy session', () => {
    const { result } = renderHook(() => useTerminal())
    const session1 = createMockSession('test-session-1')
    const session2 = createMockSession('test-session-2')

    act(() => {
      result.current.onSessionCreate(session1)
      result.current.onSessionCreate(session2)
    })

    act(() => {
      result.current.destroySession('test-session-1')
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBe('test-session-2')
    expect(result.current.activeSessionId).toBe('test-session-2') // Should switch to remaining session
  })

  it('should send input to active session', () => {
    const { result } = renderHook(() => useTerminal())
    const session1 = createMockSession('test-session-1')

    act(() => {
      result.current.onSessionCreate(session1)
    })

    act(() => {
      result.current.sendInputToActive('test command')
    })

    expect(mockApi.terminal.sendInput).toHaveBeenCalledWith('test-session-1', 'test command')
  })

  it('should clear active terminal', () => {
    const { result } = renderHook(() => useTerminal())
    const session1 = createMockSession('test-session-1')

    act(() => {
      result.current.onSessionCreate(session1)
    })

    act(() => {
      result.current.clearActiveTerminal()
    })

    expect(session1.terminal.clear).toHaveBeenCalled()
  })

  it('should resize active terminal', () => {
    const { result } = renderHook(() => useTerminal())
    const session1 = createMockSession('test-session-1')

    act(() => {
      result.current.onSessionCreate(session1)
    })

    act(() => {
      result.current.resizeActiveTerminal(80, 24)
    })

    expect(session1.terminal.resize).toHaveBeenCalledWith(80, 24)
    expect(mockApi.terminal.resize).toHaveBeenCalledWith('test-session-1', 80, 24)
  })

  it('should handle no active session gracefully', () => {
    const { result } = renderHook(() => useTerminal())

    // These should not throw errors when no active session
    act(() => {
      result.current.sendInputToActive('test')
      result.current.clearActiveTerminal()
      result.current.resizeActiveTerminal(80, 24)
    })

    expect(mockApi.terminal.sendInput).not.toHaveBeenCalled()
  })

  it('should return null for getActiveSession when no active session', () => {
    const { result } = renderHook(() => useTerminal())

    const activeSession = result.current.getActiveSession()
    expect(activeSession).toBeNull()
  })
})