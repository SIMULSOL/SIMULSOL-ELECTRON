import React from 'react'
import TerminalManager from './TerminalManager'
import './TerminalExample.css'

interface TerminalExampleProps {
  className?: string
}

export const TerminalExample: React.FC<TerminalExampleProps> = ({ className = '' }) => {
  return (
    <div className={`terminal-example ${className}`}>
      <div className="terminal-example-header">
        <h3>Integrated Terminal</h3>
        <p>Terminal emulator with Solana CLI integration</p>
      </div>
      <div className="terminal-example-content">
        <TerminalManager 
          className="terminal-example-manager"
          defaultConfig={{
            theme: 'dark',
            fontSize: 14,
            fontFamily: 'Consolas, "Courier New", monospace'
          }}
        />
      </div>
    </div>
  )
}

export default TerminalExample