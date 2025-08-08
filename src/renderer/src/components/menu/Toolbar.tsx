import React, { useCallback } from 'react'
import './Toolbar.css'

export interface ToolbarAction {
  id: string
  label: string
  icon: string
  tooltip?: string
  disabled?: boolean
  separator?: boolean
  dropdown?: ToolbarAction[]
  onClick?: () => void
}

export interface ToolbarProps {
  onAction: (actionId: string) => void
  className?: string
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    id: 'new-project',
    label: 'New Project',
    icon: '📁',
    tooltip: 'Create a new Solana project (Ctrl+Shift+N)'
  },
  {
    id: 'open-project',
    label: 'Open Project',
    icon: '📂',
    tooltip: 'Open an existing project (Ctrl+O)'
  },
  { id: 'separator1', label: '', separator: true },
  {
    id: 'save',
    label: 'Save',
    icon: '💾',
    tooltip: 'Save current file (Ctrl+S)'
  },
  {
    id: 'save-all',
    label: 'Save All',
    icon: '💾',
    tooltip: 'Save all open files (Ctrl+K S)'
  },
  { id: 'separator2', label: '', separator: true },
  {
    id: 'build',
    label: 'Build',
    icon: '🔨',
    tooltip: 'Build the current project (Ctrl+Shift+B)',
    dropdown: [
      {
        id: 'build.build',
        label: 'Build Project',
        icon: '🔨',
        tooltip: 'Build the current project'
      },
      {
        id: 'build.rebuild',
        label: 'Rebuild Project',
        icon: '🔨',
        tooltip: 'Clean and rebuild the project'
      },
      {
        id: 'build.clean',
        label: 'Clean Project',
        icon: '🧹',
        tooltip: 'Clean build artifacts'
      }
    ]
  },
  {
    id: 'test',
    label: 'Test',
    icon: '🧪',
    tooltip: 'Run tests (Ctrl+T)',
    dropdown: [
      {
        id: 'test.run',
        label: 'Run Tests',
        icon: '🧪',
        tooltip: 'Run all tests'
      },
      {
        id: 'test.debug',
        label: 'Debug Tests',
        icon: '🐛',
        tooltip: 'Debug tests with breakpoints'
      },
      {
        id: 'test.coverage',
        label: 'Test Coverage',
        icon: '📊',
        tooltip: 'Run tests with coverage report'
      }
    ]
  },
  {
    id: 'deploy',
    label: 'Deploy',
    icon: '🚀',
    tooltip: 'Deploy to Solana network (Ctrl+D)',
    dropdown: [
      {
        id: 'deploy.devnet',
        label: 'Deploy to Devnet',
        icon: '🚀',
        tooltip: 'Deploy program to Solana Devnet'
      },
      {
        id: 'deploy.testnet',
        label: 'Deploy to Testnet',
        icon: '🚀',
        tooltip: 'Deploy program to Solana Testnet'
      },
      {
        id: 'deploy.mainnet',
        label: 'Deploy to Mainnet',
        icon: '🚀',
        tooltip: 'Deploy program to Solana Mainnet'
      }
    ]
  },
  { id: 'separator3', label: '', separator: true },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: '💻',
    tooltip: 'Toggle terminal panel (Ctrl+`)'
  },
  {
    id: 'explorer',
    label: 'Explorer',
    icon: '📁',
    tooltip: 'Toggle file explorer (Ctrl+Shift+E)'
  }
]

export const Toolbar: React.FC<ToolbarProps> = ({ onAction, className = '' }) => {
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)

  const handleActionClick = useCallback((action: ToolbarAction, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (action.dropdown && action.dropdown.length > 0) {
      setActiveDropdown(activeDropdown === action.id ? null : action.id)
    } else if (!action.disabled && !action.separator) {
      onAction(action.id)
      setActiveDropdown(null)
    }
  }, [onAction, activeDropdown])

  const handleDropdownItemClick = useCallback((action: ToolbarAction, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (!action.disabled) {
      onAction(action.id)
      setActiveDropdown(null)
    }
  }, [onAction])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null)
    }

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdown])

  const renderDropdown = useCallback((items: ToolbarAction[], parentId: string) => {
    return (
      <div className="toolbar-dropdown">

    
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={`separator-${index}`} className="toolbar-dropdown-separator" />
          }

          return (
            <div
              key={item.id}
              className={`toolbar-dropdown-item ${item.disabled ? 'disabled' : ''}`}
              onClick={(e) => handleDropdownItemClick(item, e)}
              title={item.tooltip}
            >
              <span className="toolbar-dropdown-icon">{item.icon}</span>
              <span className="toolbar-dropdown-label">{item.label}</span>
            </div>
          )
        })}
      </div>
    )
  }, [handleDropdownItemClick])

  return (
    <div className={`toolbar ${className}`}>
    
      <div className="toolbar-content">
        {TOOLBAR_ACTIONS.map((action, index) => {
          if (action.separator) {
            return <div key={`separator-${index}`} className="toolbar-separator" />
          }

          const hasDropdown = action.dropdown && action.dropdown.length > 0
          const isActive = activeDropdown === action.id

          return (
            <div
              key={action.id}
              className={`toolbar-button ${action.disabled ? 'disabled' : ''} ${hasDropdown ? 'has-dropdown' : ''} ${isActive ? 'active' : ''}`}
              onClick={(e) => handleActionClick(action, e)}
              title={action.tooltip}
            >
              <span className="toolbar-button-icon">{action.icon}</span>
              <span className="toolbar-button-label">{action.label}</span>
              {hasDropdown && (
                <span className="toolbar-button-arrow">▼</span>
              )}
              
              {hasDropdown && isActive && renderDropdown(action.dropdown!, action.id)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Toolbar