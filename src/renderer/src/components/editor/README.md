# CodeEditor Component

A comprehensive Monaco Editor wrapper component designed specifically for Solana development with TypeScript support, Rust syntax highlighting, and Solana-specific language features.

## Features

- **Monaco Editor Integration**: Full-featured code editor with IntelliSense
- **Rust Syntax Highlighting**: Enhanced syntax highlighting with Solana/Anchor-specific keywords
- **File Operations**: Load and save files with automatic dirty state tracking
- **Diagnostics Support**: Display compilation errors, warnings, and hints inline
- **Auto-save**: Optional auto-save functionality with configurable delay
- **TypeScript Support**: Fully typed with comprehensive interfaces
- **Custom Theme**: Solana-specific dark theme optimized for blockchain development
- **Keyboard Shortcuts**: Built-in shortcuts (Ctrl+S for save)

## Basic Usage

```tsx
import React, { useRef } from 'react'
import { CodeEditor, useCodeEditor, CodeEditorRef } from '@renderer/components/editor'

const MyEditor: React.FC = () => {
  const editorRef = useRef<CodeEditorRef>(null)

  const { content, isDirty, loadFile, saveFile, setContent } = useCodeEditor({
    filePath: 'src/lib.rs',
    autoSave: true,
    autoSaveDelay: 2000
  })

  return (
    <CodeEditor
      ref={editorRef}
      content={content}
      language="rust"
      onContentChange={setContent}
      onSave={saveFile}
      className="my-editor"
    />
  )
}
```

## Component Props

### CodeEditor Props

```typescript
interface CodeEditorProps {
  filePath?: string // Current file path
  content?: string // Editor content
  language?: string // Programming language (default: 'rust')
  readOnly?: boolean // Read-only mode
  onContentChange?: (content: string) => void // Content change callback
  onSave?: (content: string) => void // Save callback
  onCursorPositionChange?: (position: Position) => void // Cursor position callback
  diagnostics?: Diagnostic[] // Error/warning diagnostics
  className?: string // Additional CSS classes
}
```

### CodeEditor Ref Methods

```typescript
interface CodeEditorRef {
  getContent: () => string // Get current editor content
  setContent: (content: string) => void // Set editor content
  focus: () => void // Focus the editor
  getPosition: () => Position | null // Get cursor position
  setPosition: (position: Position) => void // Set cursor position
  save: () => void // Trigger save
}
```

## useCodeEditor Hook

The `useCodeEditor` hook provides state management and file operations for the CodeEditor component.

### Hook Options

```typescript
interface UseCodeEditorOptions {
  filePath?: string // Initial file to load
  autoSave?: boolean // Enable auto-save (default: false)
  autoSaveDelay?: number // Auto-save delay in ms (default: 2000)
}
```

### Hook Return Value

```typescript
interface UseCodeEditorReturn {
  content: string // Current content
  isDirty: boolean // Has unsaved changes
  isLoading: boolean // Loading state
  diagnostics: Diagnostic[] // Current diagnostics
  cursorPosition: Position | null // Current cursor position
  editorRef: React.RefObject<CodeEditorRef> // Editor ref
  loadFile: (filePath: string) => Promise<void> // Load file
  saveFile: () => Promise<void> // Save current file
  setContent: (content: string) => void // Update content
  addDiagnostics: (diagnostics: Diagnostic[]) => void // Add diagnostics
  clearDiagnostics: () => void // Clear diagnostics
  focus: () => void // Focus editor
  getLanguageFromFilePath: (filePath: string) => string // Detect language
}
```

## Language Support

The CodeEditor supports multiple programming languages with enhanced Rust/Solana support:

- **Rust**: Full syntax highlighting with Solana/Anchor keywords
- **TOML**: Configuration files (Cargo.toml, Anchor.toml)
- **JSON**: Package and configuration files
- **TypeScript/JavaScript**: Build scripts and tools
- **Markdown**: Documentation
- **YAML**: CI/CD and configuration files

### Solana-Specific Features

The Rust language configuration includes special highlighting for:

- Anchor framework keywords (`#[program]`, `#[account]`, `#[instruction]`)
- Solana macros (`declare_id!`, `msg!`, `require!`)
- Account constraints (`init`, `mut`, `signer`, `has_one`)
- Solana types and attributes

## Diagnostics

Display compilation errors, warnings, and hints inline:

```typescript
const diagnostics: Diagnostic[] = [
  {
    range: {
      start: { line: 10, column: 5 },
      end: { line: 10, column: 15 }
    },
    message: 'unused variable: `ctx`',
    severity: 'warning',
    source: 'rust-analyzer',
    code: 'unused_variables'
  }
]

<CodeEditor diagnostics={diagnostics} />
```

## Keyboard Shortcuts

- **Ctrl+S** (Cmd+S on Mac): Save file
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+F**: Find
- **Ctrl+H**: Find and replace
- **F12**: Go to definition (when LSP is connected)

## Styling

The component includes a dark theme optimized for Solana development:

```css
.code-editor {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  border: 1px solid #3c3c3c;
}
```

You can customize the appearance by:

1. Adding custom CSS classes via the `className` prop
2. Overriding CSS variables
3. Creating custom Monaco Editor themes

## Error Handling

The component handles various error scenarios:

- **File Loading Errors**: Gracefully handles missing or inaccessible files
- **Save Errors**: Provides feedback for permission or disk space issues
- **Monaco Loading**: Shows loading state while Monaco Editor initializes
- **Language Registration**: Falls back to basic highlighting if custom language fails

## Performance Considerations

- **Lazy Loading**: Monaco Editor is loaded on demand
- **Debounced Auto-save**: Prevents excessive save operations
- **Virtual Scrolling**: Handles large files efficiently
- **Memory Management**: Proper cleanup of event listeners and watchers

## Integration with Main Process

The component integrates with the Electron main process for file operations:

```typescript
// File operations are handled through the IPC layer
await window.api.fileSystem.readFile(filePath)
await window.api.fileSystem.writeFile(filePath, content)
```

## Testing

The component includes comprehensive tests:

- Unit tests for component behavior
- Hook tests for state management
- Integration tests for file operations
- Mock implementations for Monaco Editor

Run tests with:

```bash
npm test -- src/renderer/src/components/editor
```

## Example Implementation

See `CodeEditorExample.tsx` for a complete implementation example with:

- File loading and saving
- Diagnostics display
- Auto-save functionality
- Language detection
- Error handling

## Future Enhancements

Planned improvements include:

- Language Server Protocol (LSP) integration
- Advanced IntelliSense features
- Code formatting on save
- Symbol search and navigation
- Debugging integration
- Git diff visualization
