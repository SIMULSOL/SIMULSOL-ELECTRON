import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import './TerminalComponent.css'

export interface TerminalConfig {
  cwd?: string
  theme?: 'dark' | 'light'
  fontSize?: number
  fontFamily?: string
}

export interface TerminalSession {
  id: string
  terminal: Terminal
  isActive: boolean
  title: string
}

interface TerminalComponentProps {
  config?: TerminalConfig
  onSessionCreate?: (session: TerminalSession) => void
  onSessionDestroy?: (sessionId: string) => void
  onOutput?: (data: string) => void
  className?: string
}

export const TerminalComponent: React.FC<TerminalComponentProps> = ({
  config = {},
  onSessionCreate,
  onSessionDestroy,
  onOutput,
  className = ''
}) => {
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [sessionId] = useState(() => `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [isInitialized, setIsInitialized] = useState(false)

  // Terminal theme configuration
  const getTheme = (theme: 'dark' | 'light' = 'dark') => {
    if (theme === 'light') {
      return {
        background: '#ffffff',
        foreground: '#000000',
        cursor: '#000000',
        selection: '#0078d4',
        black: '#000000',
        red: '#cd3131',
        green: '#00bc00',
        yellow: '#949800',
        blue: '#0451a5',
        magenta: '#bc05bc',
        cyan: '#0598bc',
        white: '#555555',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      }
    }
    
    return {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selection: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff'
    }
  }

  useEffect(() => {
    if (!terminalRef.current || isInitialized) return

    let unsubscribeTerminalOutput: (() => void) | undefined

    const initializeTerminal = async () => {
      // Create terminal instance
      const terminal = new Terminal({
        theme: getTheme(config.theme),
        fontSize: config.fontSize || 14,
        fontFamily: config.fontFamily || 'Consolas, "Courier New", monospace',
        cursorBlink: true,
        allowTransparency: false,
        rows: 24,
        cols: 80
      })

      // Create and attach addons
      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()
      
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(webLinksAddon)

      // Open terminal in DOM
      terminal.open(terminalRef.current!)
      
      // Store references
      terminalInstanceRef.current = terminal
      fitAddonRef.current = fitAddon

      // Fit terminal to container
      fitAddon.fit()

      // Initialize terminal session in main process first
      try {
        const terminalSession = await window.api?.terminal.create(
          config.cwd || process.cwd(),
          undefined, // shell - let system decide
          undefined  // env - use default
        )
        
        if (!terminalSession) {
          console.error('Failed to create terminal session: No response from main process')
          return
        }
      } catch (error) {
        console.error('Failed to create terminal session:', error)
        return
      }

      // Set up data handler
      terminal.onData((data) => {
        // Send data to main process via IPC
        window.api?.terminal.sendInput(sessionId, data)
        onOutput?.(data)
      })

      // Create session object
      const session: TerminalSession = {
        id: sessionId,
        terminal,
        isActive: true,
        title: `Terminal ${sessionId.split('-')[1]}`
      }

      // Notify parent component
      onSessionCreate?.(session)
      setIsInitialized(true)

      // Listen for output from main process
      const handleTerminalOutput = (data: { terminalId: string; data: string }) => {
        if (data.terminalId === sessionId && terminal) {
          terminal.write(data.data)
        }
      }

      unsubscribeTerminalOutput = window.api?.events.onTerminalOutput(handleTerminalOutput)
    }

    initializeTerminal()

    // Cleanup function
    return () => {
      if (unsubscribeTerminalOutput) {
        unsubscribeTerminalOutput()
      }
      window.api?.terminal.close(sessionId)
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose()
      }
      onSessionDestroy?.(sessionId)
    }
  }, [sessionId, config, onSessionCreate, onSessionDestroy, onOutput, isInitialized])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && terminalInstanceRef.current) {
        fitAddonRef.current.fit()
        const terminal = terminalInstanceRef.current
        window.api?.terminal.resize(sessionId, terminal.cols, terminal.rows)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sessionId])

  // Public methods for external control
  const sendInput = (input: string) => {
    if (terminalInstanceRef.current) {
      window.api?.terminal.sendInput(sessionId, input)
    }
  }

  const clear = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear()
    }
  }

  const resize = (cols: number, rows: number) => {
    if (terminalInstanceRef.current && fitAddonRef.current) {
      terminalInstanceRef.current.resize(cols, rows)
      window.api?.terminal.resize(sessionId, cols, rows)
    }
  }

  // Expose methods via ref
  React.useImperativeHandle(terminalRef, () => ({
    sendInput,
    clear,
    resize,
    getTerminal: () => terminalInstanceRef.current,
    getSessionId: () => sessionId
  }))

  return (
    <div className={`terminal-component ${className}`}>
      <div 
        ref={terminalRef} 
        className="terminal-container"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

export default TerminalComponent