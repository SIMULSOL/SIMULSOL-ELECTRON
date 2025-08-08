import React, { useRef, useEffect, useState, useCallback } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { Position, Diagnostic } from '@shared/types/Common'
import { registerRustLanguage } from './rustLanguageConfig'
import './CodeEditor.css'

export interface CodeEditorProps {
  filePath?: string
  content?: string
  language?: string
  readOnly?: boolean
  onContentChange?: (content: string) => void
  onSave?: (content: string) => void
  onCursorPositionChange?: (position: Position) => void
  diagnostics?: Diagnostic[]
  className?: string
}

export interface CodeEditorRef {
  getContent: () => string
  setContent: (content: string) => void
  focus: () => void
  getPosition: () => Position | null
  setPosition: (position: Position) => void
  save: () => void
}

const CodeEditor = React.forwardRef<CodeEditorRef, CodeEditorProps>(({
  filePath,
  content = '',
  language = 'rust',
  readOnly = false,
  onContentChange,
  onSave,
  onCursorPositionChange,
  diagnostics = [],
  className
}, ref) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [editorContent, setEditorContent] = useState(content)
  const [isLoading, setIsLoading] = useState(true)

  // Handle editor mount
  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    setIsLoading(false)

    // Register Rust language with Solana-specific syntax highlighting
    try {
      registerRustLanguage()
    } catch (error) {
      console.warn('Failed to register Rust language configuration:', error)
    }

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      lineNumbers: 'on',
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true
      }
    })

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave()
    })

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorPositionChange) {
        onCursorPositionChange({
          line: e.position.lineNumber,
          column: e.position.column
        })
      }
    })

    // Focus the editor
    editor.focus()
  }, [onCursorPositionChange])

  // Handle content changes
  const handleEditorChange: OnChange = useCallback((value) => {
    const newContent = value || ''
    setEditorContent(newContent)
    onContentChange?.(newContent)
  }, [onContentChange])

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave && editorRef.current) {
      const currentContent = editorRef.current.getValue()
      onSave(currentContent)
    }
  }, [onSave])

  // Update content when prop changes
  useEffect(() => {
    if (content !== editorContent && editorRef.current) {
      const editor = editorRef.current
      const currentPosition = editor.getPosition()
      editor.setValue(content)
      setEditorContent(content)
      
      // Restore cursor position if it was set
      if (currentPosition) {
        editor.setPosition(currentPosition)
      }
    }
  }, [content, editorContent])

  // Update diagnostics
  useEffect(() => {
    if (editorRef.current && diagnostics.length > 0) {
      const editor = editorRef.current
      const model = editor.getModel()
      
      if (model) {
        const markers = diagnostics.map(diagnostic => ({
          startLineNumber: diagnostic.range.start.line,
          startColumn: diagnostic.range.start.column,
          endLineNumber: diagnostic.range.end.line,
          endColumn: diagnostic.range.end.column,
          message: diagnostic.message,
          severity: getSeverityLevel(diagnostic.severity),
          source: diagnostic.source || 'rust-analyzer',
          code: diagnostic.code?.toString()
        }))
        
        monaco.editor.setModelMarkers(model, 'rust-analyzer', markers)
      }
    }
  }, [diagnostics])

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.getValue() || '',
    setContent: (newContent: string) => {
      if (editorRef.current) {
        editorRef.current.setValue(newContent)
        setEditorContent(newContent)
      }
    },
    focus: () => editorRef.current?.focus(),
    getPosition: () => {
      const position = editorRef.current?.getPosition()
      return position ? {
        line: position.lineNumber,
        column: position.column
      } : null
    },
    setPosition: (position: Position) => {
      if (editorRef.current) {
        editorRef.current.setPosition({
          lineNumber: position.line,
          column: position.column
        })
      }
    },
    save: handleSave
  }), [handleSave])

  // Helper function to convert diagnostic severity to Monaco severity
  const getSeverityLevel = (severity: string): monaco.MarkerSeverity => {
    switch (severity) {
      case 'error':
        return monaco.MarkerSeverity.Error
      case 'warning':
        return monaco.MarkerSeverity.Warning
      case 'info':
        return monaco.MarkerSeverity.Info
      case 'hint':
        return monaco.MarkerSeverity.Hint
      default:
        return monaco.MarkerSeverity.Info
    }
  }

  return (
    <div className={`code-editor ${className || ''}`}>
      {isLoading && (
        <div className="code-editor__loading">
          Loading editor...
        </div>
      )}
      <Editor
        height="100%"
        language={language}
        value={editorContent}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        options={{
          readOnly,
          theme: language === 'rust' ? 'solana-dark' : 'vs-dark'
        }}
        loading={<div className="code-editor__loading">Loading Monaco Editor...</div>}
      />
    </div>
  )
})

CodeEditor.displayName = 'CodeEditor'

export default CodeEditor