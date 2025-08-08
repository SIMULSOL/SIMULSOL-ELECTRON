import React, { useState } from 'react'
import TerminalComponent, { TerminalConfig } from './TerminalComponent'
import { useTerminal } from './useTerminal'
import './TerminalManager.css'

interface TerminalManagerProps {
  className?: string
  defaultConfig?: TerminalConfig
}

export const TerminalManager: React.FC<TerminalManagerProps> = ({
  className = '',
  defaultConfig = {}
}) => {
  const {
    sessions,
    activeSessionId,
    createSession,
    destroySession,
    setActiveSession,
    onSessionCreate
  } = useTerminal()

  const [nextTerminalNumber, setNextTerminalNumber] = useState(1)

  const handleCreateTerminal = () => {
    const sessionId = createSession(defaultConfig)
    setNextTerminalNumber(prev => prev + 1)
    return sessionId
  }

  const handleCloseTerminal = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    destroySession(sessionId)
  }

  const handleTabClick = (sessionId: string) => {
    setActiveSession(sessionId)
  }

  // Create first terminal if none exist
  React.useEffect(() => {
    if (sessions.length === 0) {
      handleCreateTerminal()
    }
  }, [sessions.length])

  return (
    <div className={`terminal-manager ${className}`}>
      {/* Terminal tabs */}
      <div className="terminal-tabs">
        <div className="terminal-tab-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`terminal-tab ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => handleTabClick(session.id)}
            >
              <span className="terminal-tab-title">{session.title}</span>
              <button
                className="terminal-tab-close"
                onClick={(e) => handleCloseTerminal(session.id, e)}
                title="Close terminal"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          className="terminal-new-tab"
          onClick={handleCreateTerminal}
          title="New terminal"
        >
          +
        </button>
      </div>

      {/* Terminal content */}
      <div className="terminal-content">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`terminal-panel ${session.id === activeSessionId ? 'active' : 'hidden'}`}
          >
            <TerminalComponent
              config={defaultConfig}
              onSessionCreate={onSessionCreate}
              onSessionDestroy={destroySession}
              className="terminal-instance"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default TerminalManager