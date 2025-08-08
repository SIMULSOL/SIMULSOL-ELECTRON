import React, { useRef, useState } from 'react'
import { CodeEditor, useCodeEditor, CodeEditorRef } from './index'
import { Diagnostic } from '@shared/types/Common'

const CodeEditorExample: React.FC = () => {
  const editorRef = useRef<CodeEditorRef>(null)
  const [filePath, setFilePath] = useState<string>('')
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const {
    content,
    isDirty,
    isLoading,
    diagnostics,
    loadFile,
    saveFile,
    setContent,
    addDiagnostics,
    clearDiagnostics,
    getLanguageFromFilePath
  } = useCodeEditor({
    filePath,
    autoSave: false
  })

  // Sample Rust code
  const sampleRustCode = `use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod hello_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
`

  const sampleDiagnostics: Diagnostic[] = [
    {
      range: {
        start: { line: 8, column: 5 },
        end: { line: 8, column: 15 }
      },
      message: 'unused variable: `ctx`',
      severity: 'warning',
      source: 'rust-analyzer',
      code: 'unused_variables'
    },
    {
      range: {
        start: { line: 3, column: 1 },
        end: { line: 3, column: 12 }
      },
      message: 'program ID should be updated for production',
      severity: 'info',
      source: 'anchor'
    }
  ]

  const handleLoadSample = () => {
    setContent(sampleRustCode)
    setFilePath('src/lib.rs')
  }

  const handleSave = async () => {
    try {
      await saveFile()
      alert('File saved successfully!')
    } catch (error) {
      alert('Failed to save file: ' + error)
    }
  }

  const handleToggleDiagnostics = () => {
    if (showDiagnostics) {
      clearDiagnostics()
      setShowDiagnostics(false)
    } else {
      addDiagnostics(sampleDiagnostics)
      setShowDiagnostics(true)
    }
  }

  const handleFocus = () => {
    editorRef.current?.focus()
  }

  const handleGetContent = () => {
    const currentContent = editorRef.current?.getContent()
    alert(`Current content length: ${currentContent?.length || 0} characters`)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
        <h3>Monaco Code Editor Example</h3>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={handleLoadSample} style={{ marginRight: '10px' }}>
            Load Sample Rust Code
          </button>
          <button onClick={handleSave} disabled={!isDirty} style={{ marginRight: '10px' }}>
            Save {isDirty ? '(*)' : ''}
          </button>
          <button onClick={handleToggleDiagnostics} style={{ marginRight: '10px' }}>
            {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
          </button>
          <button onClick={handleFocus} style={{ marginRight: '10px' }}>
            Focus Editor
          </button>
          <button onClick={handleGetContent}>
            Get Content Info
          </button>
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          File: {filePath || 'No file loaded'} | 
          Language: {filePath ? getLanguageFromFilePath(filePath) : 'plaintext'} | 
          Status: {isLoading ? 'Loading...' : isDirty ? 'Modified' : 'Saved'} | 
          Diagnostics: {diagnostics.length}
        </div>
      </div>
      
      <div style={{ flex: 1, padding: '10px' }}>
        <CodeEditor
          ref={editorRef}
          filePath={filePath}
          content={content}
          language={filePath ? getLanguageFromFilePath(filePath) : 'rust'}
          onContentChange={setContent}
          onSave={handleSave}
          diagnostics={diagnostics}
          className="example-editor"
        />
      </div>
    </div>
  )
}

export default CodeEditorExample