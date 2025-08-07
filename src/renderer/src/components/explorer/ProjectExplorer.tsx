import React, { useState, useCallback, useEffect, useRef } from 'react'
import './ProjectExplorer.css'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  isExpanded?: boolean
  isSelected?: boolean
  metadata?: {
    size?: number
    modified?: Date
    isHidden?: boolean
  }
}

import { ProjectValidationError } from './useProjectExplorer'

export interface ProjectExplorerProps {
  projectPath?: string
  files: FileNode[]
  selectedFiles: string[]
  validationErrors?: ProjectValidationError[]
  onFileSelect: (filePath: string, isMultiSelect?: boolean) => void
  onFileOpen: (filePath: string) => void
  onFileCreate: (parentPath: string, name: string, type: 'file' | 'directory') => Promise<void>
  onFileDelete: (filePath: string) => Promise<void>
  onFileRename: (oldPath: string, newName: string) => Promise<void>
  onRefresh: () => Promise<void>
  onValidateProject?: () => void
  className?: string
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  targetPath: string
  targetType: 'file' | 'directory'
}

const FILE_ICONS: Record<string, string> = {
  // Solana specific files
  '.rs': '🦀',
  '.toml': '⚙️',
  '.json': '📋',
  '.yaml': '📄',
  '.yml': '📄',
  '.so': '⚡', // Solana program binary
  '.keypair': '🔑',
  
  // Web
  '.ts': '📘',
  '.tsx': '⚛️',
  '.js': '📜',
  '.jsx': '⚛️',
  '.html': '🌐',
  '.css': '🎨',
  '.scss': '🎨',
  '.less': '🎨',
  
  // Config
  '.md': '📝',
  '.txt': '📄',
  '.log': '📊',
  '.env': '🔐',
  '.gitignore': '🚫',
  '.gitattributes': '📋',
  
  // Solana-specific build files
  'Cargo.toml': '📦',
  'Cargo.lock': '🔒',
  'Anchor.toml': '⚓',
  'deploy.js': '🚀',
  'deploy.ts': '🚀',
  'localnet.json': '🌐',
  'devnet.json': '🌐',
  'mainnet.json': '🌐',
  
  // General build files
  'package.json': '📦',
  'package-lock.json': '🔒',
  'tsconfig.json': '📘',
  'yarn.lock': '🔒',
  
  // IDL files
  '.idl': '📜',
  
  // Default
  'directory': '📁',
  'file': '📄'
}

const getSolanaFileType = (fileName: string): 'solana' | 'anchor' | 'rust' | 'config' | 'deploy' | 'idl' | 'other' => {
  // Anchor-specific files
  if (fileName === 'Anchor.toml' || fileName.includes('anchor') || fileName.includes('Anchor')) return 'anchor'
  
  // Deployment scripts
  if (fileName.startsWith('deploy.') || fileName.includes('deploy')) return 'deploy'
  
  // IDL files (Interface Definition Language)
  if (fileName.endsWith('.idl') || fileName.includes('.idl.')) return 'idl'
  
  // Rust/Cargo files
  if (fileName === 'Cargo.toml' || fileName === 'Cargo.lock') return 'rust'
  
  // Solana program files
  if (fileName.endsWith('.rs') || fileName.endsWith('.so') || fileName.endsWith('.keypair')) return 'solana'
  
  // Configuration files
  if (fileName.endsWith('.toml') || fileName.endsWith('.json') || fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'config'
  
  return 'other'
}

const getFileIcon = (node: FileNode): string => {
  if (node.type === 'directory') {
    return node.isExpanded ? '📂' : '📁'
  }
  
  const extension = '.' + node.name.split('.').pop()
  return FILE_ICONS[extension] || FILE_ICONS[node.name] || FILE_ICONS.file
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  projectPath,
  files,
  selectedFiles,
  validationErrors = [],
  onFileSelect,
  onFileOpen,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onRefresh,
  onValidateProject,
  className = ''
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    targetPath: '',
    targetType: 'file'
  })
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, isOpen: false }))
      }
    }

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu.isOpen])

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingPath])

  const handleNodeClick = useCallback((node: FileNode, event: React.MouseEvent) => {
    event.stopPropagation()
    
    const isMultiSelect = event.ctrlKey || event.metaKey
    onFileSelect(node.path, isMultiSelect)

    if (node.type === 'directory') {
      setExpandedDirs(prev => {
        const newSet = new Set(prev)
        if (newSet.has(node.path)) {
          newSet.delete(node.path)
        } else {
          newSet.add(node.path)
        }
        return newSet
      })
    }
  }, [onFileSelect])

  const handleNodeDoubleClick = useCallback((node: FileNode, event: React.MouseEvent) => {
    event.stopPropagation()
    if (node.type === 'file') {
      onFileOpen(node.path)
    }
  }, [onFileOpen])

  const handleContextMenu = useCallback((node: FileNode, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      targetPath: node.path,
      targetType: node.type
    })
  }, [])

  const handleCreateFile = useCallback(async (type: 'file' | 'directory') => {
    const name = prompt(`Enter ${type} name:`)
    if (name) {
      try {
        await onFileCreate(contextMenu.targetPath, name, type)
        setContextMenu(prev => ({ ...prev, isOpen: false }))
      } catch (error) {
        alert(`Failed to create ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }, [contextMenu.targetPath, onFileCreate])

  const handleDelete = useCallback(async () => {
    if (confirm(`Are you sure you want to delete "${contextMenu.targetPath}"?`)) {
      try {
        await onFileDelete(contextMenu.targetPath)
        setContextMenu(prev => ({ ...prev, isOpen: false }))
      } catch (error) {
        alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }, [contextMenu.targetPath, onFileDelete])

  const handleRename = useCallback(() => {
    const fileName = contextMenu.targetPath.split('/').pop() || ''
    setNewName(fileName)
    setRenamingPath(contextMenu.targetPath)
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }, [contextMenu.targetPath])

  const handleRenameSubmit = useCallback(async () => {
    if (renamingPath && newName.trim()) {
      try {
        await onFileRename(renamingPath, newName.trim())
        setRenamingPath(null)
        setNewName('')
      } catch (error) {
        alert(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }, [renamingPath, newName, onFileRename])

  const handleRenameCancel = useCallback(() => {
    setRenamingPath(null)
    setNewName('')
  }, [])

  const handleRenameKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleRenameSubmit()
    } else if (event.key === 'Escape') {
      handleRenameCancel()
    }
  }, [handleRenameSubmit, handleRenameCancel])

  const handleDragStart = useCallback((node: FileNode, event: React.DragEvent) => {
    setDraggedItem(node.path)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', node.path)
  }, [])

  const handleDragOver = useCallback((node: FileNode, event: React.DragEvent) => {
    if (node.type === 'directory' && draggedItem !== node.path) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setDropTarget(node.path)
    }
  }, [draggedItem])

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  const handleDrop = useCallback(async (node: FileNode, event: React.DragEvent) => {
    event.preventDefault()
    setDropTarget(null)
    
    if (draggedItem && node.type === 'directory' && draggedItem !== node.path) {
      const draggedName = draggedItem.split('/').pop() || ''
      const newPath = `${node.path}/${draggedName}`
      
      try {
        await onFileRename(draggedItem, newPath)
      } catch (error) {
        alert(`Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    setDraggedItem(null)
  }, [draggedItem, onFileRename])

  const renderNode = useCallback((node: FileNode, depth: number = 0): React.ReactNode => {
    const isSelected = selectedFiles.includes(node.path)
    const isExpanded = expandedDirs.has(node.path)
    const isRenaming = renamingPath === node.path
    const isDragTarget = dropTarget === node.path
    const solanaType = getSolanaFileType(node.name)
    
    return (
      <div key={node.path} className="explorer-node-container">
        <div
          className={`
            explorer-node
            ${isSelected ? 'selected' : ''}
            ${isDragTarget ? 'drag-target' : ''}
            ${solanaType !== 'other' ? `solana-${solanaType}` : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={(e) => handleNodeClick(node, e)}
          onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
          onContextMenu={(e) => handleContextMenu(node, e)}
          draggable={!isRenaming}
          onDragStart={(e) => handleDragStart(node, e)}
          onDragOver={(e) => handleDragOver(node, e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(node, e)}
        >
          {node.type === 'directory' && (
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
              ▶
            </span>
          )}
          
          <span className="file-icon">
            {getFileIcon({ ...node, isExpanded })}
          </span>
          
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="rename-input"
            />
          ) : (
            <span className="file-name" title={node.path}>
              {node.name}
            </span>
          )}
          
          {node.metadata?.size && node.type === 'file' && (
            <span className="file-size">
              {formatFileSize(node.metadata.size)}
            </span>
          )}
        </div>
        
        {node.type === 'directory' && isExpanded && node.children && (
          <div className="explorer-children">
            {node.children
              .sort((a, b) => {
                // Directories first, then files
                if (a.type !== b.type) {
                  return a.type === 'directory' ? -1 : 1
                }
                return a.name.localeCompare(b.name)
              })
              .map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }, [
    selectedFiles,
    expandedDirs,
    renamingPath,
    dropTarget,
    newName,
    handleNodeClick,
    handleNodeDoubleClick,
    handleContextMenu,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRenameSubmit,
    handleRenameKeyDown
  ])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className={`project-explorer ${className}`}>
      <div className="explorer-header">
        <div className="explorer-title">
          {projectPath ? `Explorer - ${projectPath.split('/').pop()}` : 'Explorer'}
        </div>
        <div className="explorer-actions">
          <button
            className="action-button"
            onClick={onRefresh}
            title="Refresh"
          >
            🔄
          </button>
          <button
            className="action-button"
            onClick={() => handleCreateFile('file')}
            title="New File"
          >
            📄
          </button>
          <button
            className="action-button"
            onClick={() => handleCreateFile('directory')}
            title="New Folder"
          >
            📁
          </button>
        </div>
      </div>
      
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <div className="validation-header">
            <span className="validation-icon">⚠️</span>
            <span className="validation-title">Project Configuration Issues</span>
            {onValidateProject && (
              <button
                className="action-button"
                onClick={onValidateProject}
                title="Re-validate Project"
              >
                🔍
              </button>
            )}
          </div>
          <div className="validation-list">
            {validationErrors.map((error, index) => (
              <div key={index} className="validation-error">
                <div className="error-file">{error.file}</div>
                <div className="error-message">{error.message}</div>
                <div className="error-suggestion">{error.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="explorer-content">
        {files.length === 0 ? (
          <div className="empty-state">
            <p>No files in project</p>
            <button onClick={() => handleCreateFile('file')}>
              Create your first file
            </button>
          </div>
        ) : (
          files
            .sort((a, b) => {
              if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1
              }
              return a.name.localeCompare(b.name)
            })
            .map(node => renderNode(node))
        )}
      </div>

      {contextMenu.isOpen && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <div className="context-menu-item" onClick={() => handleCreateFile('file')}>
            📄 New File
          </div>
          <div className="context-menu-item" onClick={() => handleCreateFile('directory')}>
            📁 New Folder
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={handleRename}>
            ✏️ Rename
          </div>
          <div className="context-menu-item" onClick={handleDelete}>
            🗑️ Delete
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={onRefresh}>
            🔄 Refresh
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectExplorer