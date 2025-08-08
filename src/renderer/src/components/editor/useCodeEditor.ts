import { useState, useCallback, useRef, useEffect } from 'react'
import { Position, Diagnostic } from '@shared/types/Common'
import { CodeEditorRef } from './CodeEditor'

export interface UseCodeEditorOptions {
  filePath?: string
  autoSave?: boolean
  autoSaveDelay?: number
}

export interface UseCodeEditorReturn {
  content: string
  isDirty: boolean
  isLoading: boolean
  diagnostics: Diagnostic[]
  cursorPosition: Position | null
  editorRef: React.RefObject<CodeEditorRef>
  loadFile: (filePath: string) => Promise<void>
  saveFile: () => Promise<void>
  setContent: (content: string) => void
  addDiagnostics: (diagnostics: Diagnostic[]) => void
  clearDiagnostics: () => void
  focus: () => void
  getLanguageFromFilePath: (filePath: string) => string
}

export const useCodeEditor = (options: UseCodeEditorOptions = {}): UseCodeEditorReturn => {
  const { filePath, autoSave = false, autoSaveDelay = 2000 } = options
  
  const [content, setContentState] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [cursorPosition, setCursorPosition] = useState<Position | null>(null)
  
  const editorRef = useRef<CodeEditorRef>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const currentFilePathRef = useRef<string>()

  // Load file content
  const loadFile = useCallback(async (newFilePath: string) => {
    setIsLoading(true)
    try {
      // Use API to load file content from main process
      const result = await window.api.fileSystem.readFile(newFilePath)
      setContentState(result.content)
      setOriginalContent(result.content)
      setIsDirty(false)
      currentFilePathRef.current = newFilePath
      setDiagnostics([]) // Clear diagnostics when loading new file
    } catch (error) {
      console.error('Failed to load file:', error)
      // Handle error - could show notification or error state
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save file content
  const saveFile = useCallback(async () => {
    if (!currentFilePathRef.current || !isDirty) return

    try {
      const currentContent = editorRef.current?.getContent() || content
      await window.api.fileSystem.writeFile(currentFilePathRef.current, currentContent)
      setOriginalContent(currentContent)
      setIsDirty(false)
    } catch (error) {
      console.error('Failed to save file:', error)
      // Handle error - could show notification or error state
    }
  }, [content, isDirty])

  // Set content and track dirty state
  const setContent = useCallback((newContent: string) => {
    setContentState(newContent)
    setIsDirty(newContent !== originalContent)

    // Handle auto-save
    if (autoSave && currentFilePathRef.current) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveFile()
      }, autoSaveDelay)
    }
  }, [originalContent, autoSave, autoSaveDelay, saveFile])

  // Add diagnostics
  const addDiagnostics = useCallback((newDiagnostics: Diagnostic[]) => {
    setDiagnostics(prev => [...prev, ...newDiagnostics])
  }, [])

  // Clear diagnostics
  const clearDiagnostics = useCallback(() => {
    setDiagnostics([])
  }, [])

  // Focus editor
  const focus = useCallback(() => {
    editorRef.current?.focus()
  }, [])

  // Get language from file path
  const getLanguageFromFilePath = useCallback((filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'rs':
        return 'rust'
      case 'toml':
        return 'toml'
      case 'json':
        return 'json'
      case 'yaml':
      case 'yml':
        return 'yaml'
      case 'md':
        return 'markdown'
      case 'ts':
        return 'typescript'
      case 'js':
        return 'javascript'
      case 'html':
        return 'html'
      case 'css':
        return 'css'
      case 'sh':
        return 'shell'
      default:
        return 'plaintext'
    }
  }, [])

  // Load initial file if provided
  useEffect(() => {
    if (filePath && filePath !== currentFilePathRef.current) {
      loadFile(filePath)
    }
  }, [filePath, loadFile])

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  return {
    content,
    isDirty,
    isLoading,
    diagnostics,
    cursorPosition,
    editorRef,
    loadFile,
    saveFile,
    setContent,
    addDiagnostics,
    clearDiagnostics,
    focus,
    getLanguageFromFilePath
  }
}