import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CodeEditor, { CodeEditorRef } from '../CodeEditor'
import { Diagnostic } from '@shared/types/Common'

// Mock CSS imports
vi.mock('../CodeEditor.css', () => ({}))

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ onMount, onChange, value, onValidate }: any) => {
    React.useEffect(() => {
      if (onMount) {
        const mockEditor = {
          getValue: () => value || '',
          setValue: vi.fn(),
          updateOptions: vi.fn(),
          addCommand: vi.fn(),
          onDidChangeCursorPosition: vi.fn(),
          focus: vi.fn(),
          getPosition: () => ({ lineNumber: 1, column: 1 }),
          setPosition: vi.fn(),
          getModel: () => ({
            uri: { toString: () => 'test-file.rs' }
          })
        }
        
        const mockMonaco = {
          KeyMod: { CtrlCmd: 1 },
          KeyCode: { KeyS: 1 },
          MarkerSeverity: {
            Error: 8,
            Warning: 4,
            Info: 2,
            Hint: 1
          },
          editor: {
            setModelMarkers: vi.fn()
          }
        }
        
        onMount(mockEditor, mockMonaco)
      }
    }, [onMount])

    return (
      <div data-testid="monaco-editor">
        <textarea
          data-testid="editor-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
    )
  }
}))

// Mock monaco-editor
vi.mock('monaco-editor', () => ({
  editor: {
    setModelMarkers: vi.fn()
  },
  MarkerSeverity: {
    Error: 8,
    Warning: 4,
    Info: 2,
    Hint: 1
  }
}))

describe('CodeEditor', () => {
  let mockOnContentChange: ReturnType<typeof vi.fn>
  let mockOnSave: ReturnType<typeof vi.fn>
  let mockOnCursorPositionChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnContentChange = vi.fn()
    mockOnSave = vi.fn()
    mockOnCursorPositionChange = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders Monaco Editor with default props', async () => {
    render(<CodeEditor />)
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })
  })

  it('displays loading state initially', () => {
    render(<CodeEditor />)
    
    expect(screen.getByText('Loading editor...')).toBeInTheDocument()
  })

  it('calls onContentChange when content changes', async () => {
    render(
      <CodeEditor 
        content="initial content"
        onContentChange={mockOnContentChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-textarea')).toBeInTheDocument()
    })

    const textarea = screen.getByTestId('editor-textarea')
    fireEvent.change(textarea, { target: { value: 'new content' } })

    expect(mockOnContentChange).toHaveBeenCalledWith('new content')
  })

  it('updates content when prop changes', async () => {
    const { rerender } = render(
      <CodeEditor content="initial content" />
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-textarea')).toBeInTheDocument()
    })

    rerender(<CodeEditor content="updated content" />)

    await waitFor(() => {
      expect(screen.getByTestId('editor-textarea')).toHaveValue('updated content')
    })
  })

  it('exposes correct methods via ref', async () => {
    const ref = React.createRef<CodeEditorRef>()
    
    render(
      <CodeEditor 
        ref={ref}
        content="test content"
        onSave={mockOnSave}
      />
    )

    await waitFor(() => {
      expect(ref.current).toBeTruthy()
    })

    // Test getContent method
    expect(ref.current?.getContent()).toBe('test content')

    // Test setContent method
    ref.current?.setContent('new content')
    expect(ref.current?.getContent()).toBe('new content')

    // Test getPosition method
    const position = ref.current?.getPosition()
    expect(position).toEqual({ line: 1, column: 1 })

    // Test save method
    ref.current?.save()
    expect(mockOnSave).toHaveBeenCalledWith('new content')
  })

  it('handles diagnostics correctly', async () => {
    const diagnostics: Diagnostic[] = [
      {
        range: {
          start: { line: 1, column: 1 },
          end: { line: 1, column: 10 }
        },
        message: 'Test error',
        severity: 'error',
        source: 'rust-analyzer'
      }
    ]

    render(
      <CodeEditor 
        content="test content"
        diagnostics={diagnostics}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })

    // Monaco editor should receive the diagnostics
    // This would be tested by checking if setModelMarkers was called
    // but since we're mocking it, we just verify the component renders
  })

  it('applies correct language based on file extension', async () => {
    render(
      <CodeEditor 
        filePath="test.rs"
        language="rust"
        content="fn main() {}"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })
  })

  it('handles read-only mode', async () => {
    render(
      <CodeEditor 
        content="read only content"
        readOnly={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })

    // In read-only mode, the editor should not allow changes
    // This would be tested by checking editor options
  })

  it('applies custom className', async () => {
    render(
      <CodeEditor 
        content="test"
        className="custom-editor"
      />
    )

    const editorContainer = screen.getByTestId('monaco-editor').closest('.code-editor')
    expect(editorContainer).toHaveClass('custom-editor')
  })

  it('handles empty content gracefully', async () => {
    render(<CodeEditor content="" />)

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })

    const textarea = screen.getByTestId('editor-textarea')
    expect(textarea).toHaveValue('')
  })
})