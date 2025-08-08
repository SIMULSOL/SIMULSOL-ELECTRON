# Terminal Components

This directory contains the terminal emulator components for the Solana IDE, providing integrated terminal functionality with xterm.js.

## Components

### TerminalComponent

The core terminal emulator component that wraps xterm.js and provides integration with the main process.

**Features:**
- Full terminal emulation using xterm.js
- Configurable themes (dark/light)
- Resizable terminal with fit addon
- Web links support
- IPC integration for command execution

**Usage:**
```tsx
import { TerminalComponent } from './components/terminal'

<TerminalComponent
  config={{
    cwd: '/path/to/project',
    theme: 'dark',
    fontSize: 14,
    fontFamily: 'Consolas'
  }}
  onSessionCreate={(session) => console.log('Terminal created:', session.id)}
  onSessionDestroy={(sessionId) => console.log('Terminal destroyed:', sessionId)}
  onOutput={(data) => console.log('Terminal output:', data)}
/>
```

### TerminalManager

A higher-level component that manages multiple terminal sessions with tabs.

**Features:**
- Multiple terminal tabs
- Tab creation and closing
- Active session management
- Integrated terminal controls

**Usage:**
```tsx
import { TerminalManager } from './components/terminal'

<TerminalManager
  defaultConfig={{
    theme: 'dark',
    fontSize: 14
  }}
/>
```

### useTerminal Hook

A React hook for managing terminal sessions programmatically.

**Features:**
- Session lifecycle management
- Active session tracking
- Input/output handling
- Terminal operations (clear, resize)

**Usage:**
```tsx
import { useTerminal } from './components/terminal'

function MyComponent() {
  const {
    sessions,
    activeSessionId,
    createSession,
    destroySession,
    sendInputToActive,
    clearActiveTerminal
  } = useTerminal()

  // Use terminal operations...
}
```

### TerminalExample

A demonstration component showing terminal integration.

## Configuration

### TerminalConfig

```typescript
interface TerminalConfig {
  cwd?: string           // Working directory
  theme?: 'dark' | 'light'  // Terminal theme
  fontSize?: number      // Font size in pixels
  fontFamily?: string    // Font family
}
```

### TerminalSession

```typescript
interface TerminalSession {
  id: string            // Unique session identifier
  terminal: Terminal    // xterm.js Terminal instance
  isActive: boolean     // Whether session is currently active
  title: string         // Display title for the session
}
```

## IPC Integration

The terminal components communicate with the main process through IPC channels:

- `terminal:create` - Create new terminal session
- `terminal:input` - Send input to terminal
- `terminal:resize` - Resize terminal
- `terminal:close` - Close terminal session
- `event:terminal-output` - Receive terminal output

## Styling

Terminal components use CSS modules and support both dark and light themes. The styling is designed to integrate with the overall IDE theme.

## Testing

Components include comprehensive unit tests using Vitest and React Testing Library:

- `TerminalComponent.test.tsx` - Tests for the core terminal component
- `useTerminal.test.ts` - Tests for the terminal management hook

## Requirements

This implementation satisfies the following requirements:

- **5.1**: Fully functional terminal interface within the IDE
- **5.2**: Automatic working directory setup to project root
- **5.6**: Terminal resizing and theme support

The terminal integration provides a solid foundation for Solana CLI integration and command execution within the IDE environment.