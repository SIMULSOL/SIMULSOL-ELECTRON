import { useState, useCallback, useRef } from 'react'
import { TerminalSession, TerminalConfig } from './TerminalComponent'

export interface UseTerminalReturn {
  sessions: TerminalSession[]
  activeSessionId: string | null
  createSession: (config?: TerminalConfig) => string
  destroySession: (sessionId: string) => void
  setActiveSession: (sessionId: string) => void
  getActiveSession: () => TerminalSession | null
  sendInputToActive: (input: string) => void
  clearActiveTerminal: () => void
  resizeActiveTerminal: (cols: number, rows: number) => void
  onSessionCreate: (session: TerminalSession) => void
}

export const useTerminal = (): UseTerminalReturn => {
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const sessionRefs = useRef<Map<string, TerminalSession>>(new Map())

  const createSession = useCallback((config?: TerminalConfig): string => {
    const sessionId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Session will be added when TerminalComponent calls onSessionCreate
    return sessionId
  }, [])

  const handleSessionCreate = useCallback(
    (session: TerminalSession) => {
      sessionRefs.current.set(session.id, session)
      setSessions((prev) => [...prev, session])

      // Set as active if it's the first session
      if (sessions.length === 0) {
        setActiveSessionId(session.id)
      }
    },
    [sessions.length]
  )

  const destroySession = useCallback(
    (sessionId: string) => {
      sessionRefs.current.delete(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))

      // If destroying active session, switch to another one
      if (activeSessionId === sessionId) {
        setSessions((prev) => {
          const remaining = prev.filter((s) => s.id !== sessionId)
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id)
          } else {
            setActiveSessionId(null)
          }
          return remaining
        })
      }
    },
    [activeSessionId]
  )

  const setActiveSession = useCallback((sessionId: string) => {
    const session = sessionRefs.current.get(sessionId)
    if (session) {
      // Update all sessions' active status
      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          isActive: s.id === sessionId
        }))
      )
      setActiveSessionId(sessionId)
    }
  }, [])

  const getActiveSession = useCallback((): TerminalSession | null => {
    if (!activeSessionId) return null
    return sessionRefs.current.get(activeSessionId) || null
  }, [activeSessionId])

  const sendInputToActive = useCallback(
    (input: string) => {
      const activeSession = getActiveSession()
      if (activeSession) {
        // Send input via IPC to main process
        window.api?.terminal.sendInput(activeSession.id, input)
      }
    },
    [getActiveSession]
  )

  const clearActiveTerminal = useCallback(() => {
    const activeSession = getActiveSession()
    if (activeSession) {
      activeSession.terminal.clear()
    }
  }, [getActiveSession])

  const resizeActiveTerminal = useCallback(
    (cols: number, rows: number) => {
      const activeSession = getActiveSession()
      if (activeSession) {
        activeSession.terminal.resize(cols, rows)
        window.api?.terminal.resize(activeSession.id, cols, rows)
      }
    },
    [getActiveSession]
  )

  return {
    sessions,
    activeSessionId,
    createSession,
    destroySession,
    setActiveSession,
    getActiveSession,
    sendInputToActive,
    clearActiveTerminal,
    resizeActiveTerminal,
    onSessionCreate: handleSessionCreate
  }
}
