import React, { useState, useCallback, useRef, useEffect } from 'react'
import './MainMenu.css'

export interface MenuAction {
  id: string
  label: string
  shortcut?: string
  icon?: string
  disabled?: boolean
  separator?: boolean
  submenu?: MenuAction[]
  onClick?: () => void
}

export interface MainMenuProps {
  onAction: (actionId: string) => void
  className?: string
}

const MENU_STRUCTURE: MenuAction[] = [
  {
    id: 'file',
    label: 'File',
    submenu: [
      {
        id: 'file.new',
        label: 'New',
        submenu: [
          {
            id: 'file.new.project',
            label: 'New Project...',
            shortcut: 'Ctrl+Shift+N',
            icon: '📁'
          },
          {
            id: 'file.new.file',
            label: 'New File',
            shortcut: 'Ctrl+N',
            icon: '📄'
          },
          {
            id: 'file.new.folder',
            label: 'New Folder',
            shortcut: 'Ctrl+Shift+F',
            icon: '📁'
          }
        ]
      },
      {
        id: 'file.open',
        label: 'Open',
        submenu: [
          {
            id: 'file.open.project',
            label: 'Open Project...',
            shortcut: 'Ctrl+O',
            icon: '📂'
          },
          {
            id: 'file.open.file',
            label: 'Open File...',
            shortcut: 'Ctrl+Shift+O',
            icon: '📄'
          },
          {
            id: 'file.open.recent',
            label: 'Open Recent',
            icon: '🕒',
            submenu: [
              {
                id: 'file.open.recent.clear',
                label: 'Clear Recent Projects',
                icon: '🗑️'
              }
            ]
          }
        ]
      },
      { id: 'separator1', label: '', separator: true },
      {
        id: 'file.save',
        label: 'Save',
        shortcut: 'Ctrl+S',
        icon: '💾'
      },
      {
        id: 'file.save.as',
        label: 'Save As...',
        shortcut: 'Ctrl+Shift+S',
        icon: '💾'
      },
      {
        id: 'file.save.all',
        label: 'Save All',
        shortcut: 'Ctrl+K S',
        icon: '💾'
      },
      { id: 'separator2', label: '', separator: true },
      {
        id: 'file.close',
        label: 'Close File',
        shortcut: 'Ctrl+W',
        icon: '✖️'
      },
      {
        id: 'file.close.project',
        label: 'Close Project',
        shortcut: 'Ctrl+Shift+W',
        icon: '✖️'
      },
      { id: 'separator3', label: '', separator: true },
      {
        id: 'file.exit',
        label: 'Exit',
        shortcut: 'Alt+F4',
        icon: '🚪'
      }
    ]
  },
  {
    id: 'edit',
    label: 'Edit',
    submenu: [
      {
        id: 'edit.undo',
        label: 'Undo',
        shortcut: 'Ctrl+Z',
        icon: '↶'
      },
      {
        id: 'edit.redo',
        label: 'Redo',
        shortcut: 'Ctrl+Y',
        icon: '↷'
      },
      { id: 'separator4', label: '', separator: true },
      {
        id: 'edit.cut',
        label: 'Cut',
        shortcut: 'Ctrl+X',
        icon: '✂️'
      },
      {
        id: 'edit.copy',
        label: 'Copy',
        shortcut: 'Ctrl+C',
        icon: '📋'
      },
      {
        id: 'edit.paste',
        label: 'Paste',
        shortcut: 'Ctrl+V',
        icon: '📋'
      },
      { id: 'separator5', label: '', separator: true },
      {
        id: 'edit.find',
        label: 'Find',
        shortcut: 'Ctrl+F',
        icon: '🔍'
      },
      {
        id: 'edit.replace',
        label: 'Replace',
        shortcut: 'Ctrl+H',
        icon: '🔄'
      },
      {
        id: 'edit.find.files',
        label: 'Find in Files',
        shortcut: 'Ctrl+Shift+F',
        icon: '🔍'
      }
    ]
  },
  {
    id: 'view',
    label: 'View',
    submenu: [
      {
        id: 'view.explorer',
        label: 'Explorer',
        shortcut: 'Ctrl+Shift+E',
        icon: '📁'
      },
      {
        id: 'view.terminal',
        label: 'Terminal',
        shortcut: 'Ctrl+`',
        icon: '💻'
      },
      {
        id: 'view.output',
        label: 'Output',
        shortcut: 'Ctrl+Shift+U',
        icon: '📄'
      },
      { id: 'separator6', label: '', separator: true },
      {
        id: 'view.zoom.in',
        label: 'Zoom In',
        shortcut: 'Ctrl+=',
        icon: '🔍'
      },
      {
        id: 'view.zoom.out',
        label: 'Zoom Out',
        shortcut: 'Ctrl+-',
        icon: '🔍'
      },
      {
        id: 'view.zoom.reset',
        label: 'Reset Zoom',
        shortcut: 'Ctrl+0',
        icon: '🔍'
      },
      { id: 'separator7', label: '', separator: true },
      {
        id: 'view.fullscreen',
        label: 'Toggle Fullscreen',
        shortcut: 'F11',
        icon: '⛶'
      }
    ]
  },
  {
    id: 'build',
    label: 'Build',
    submenu: [
      {
        id: 'build.build',
        label: 'Build Project',
        shortcut: 'Ctrl+Shift+B',
        icon: '🔨'
      },
      {
        id: 'build.rebuild',
        label: 'Rebuild Project',
        shortcut: 'Ctrl+Shift+R',
        icon: '🔨'
      },
      {
        id: 'build.clean',
        label: 'Clean Project',
        shortcut: 'Ctrl+Shift+C',
        icon: '🧹'
      },
      { id: 'separator8', label: '', separator: true },
      {
        id: 'build.test',
        label: 'Run Tests',
        shortcut: 'Ctrl+T',
        icon: '🧪'
      },
      {
        id: 'build.test.debug',
        label: 'Debug Tests',
        shortcut: 'Ctrl+Shift+T',
        icon: '🐛'
      },
      { id: 'separator9', label: '', separator: true },
      {
        id: 'build.deploy',
        label: 'Deploy to Devnet',
        shortcut: 'Ctrl+D',
        icon: '🚀'
      },
      {
        id: 'build.deploy.mainnet',
        label: 'Deploy to Mainnet',
        icon: '🚀'
      }
    ]
  },
  {
    id: 'help',
    label: 'Help',
    submenu: [
      {
        id: 'help.docs',
        label: 'Documentation',
        shortcut: 'F1',
        icon: '📚'
      },
      {
        id: 'help.solana.docs',
        label: 'Solana Documentation',
        icon: '📚'
      },
      {
        id: 'help.anchor.docs',
        label: 'Anchor Documentation',
        icon: '⚓'
      },
      { id: 'separator10', label: '', separator: true },
      {
        id: 'help.shortcuts',
        label: 'Keyboard Shortcuts',
        shortcut: 'Ctrl+K Ctrl+S',
        icon: '⌨️'
      },
      { id: 'separator11', label: '', separator: true },
      {
        id: 'help.about',
        label: 'About Solana IDE',
        icon: 'ℹ️'
      }
    ]
  }
]

export const MainMenu: React.FC<MainMenuProps> = ({ onAction, className = '' }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set())
  const menuRef = useRef<HTMLDivElement>(null)

  const handleMenuClick = useCallback((menuId: string) => {
    if (activeMenu === menuId) {
      setActiveMenu(null)
      setOpenSubmenus(new Set())
    } else {
      setActiveMenu(menuId)
      setOpenSubmenus(new Set())
    }
  }, [activeMenu])

  const handleMenuItemClick = useCallback((action: MenuAction, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (action.submenu) {
      setOpenSubmenus(prev => {
        const newSet = new Set(prev)
        if (newSet.has(action.id)) {
          newSet.delete(action.id)
        } else {
          newSet.add(action.id)
        }
        return newSet
      })
    } else if (!action.disabled && !action.separator) {
      onAction(action.id)
      setActiveMenu(null)
      setOpenSubmenus(new Set())
    }
  }, [onAction])

  const handleMouseEnter = useCallback((menuId: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuId)
      setOpenSubmenus(new Set())
    }
  }, [activeMenu])

  const handleSubmenuMouseEnter = useCallback((submenuId: string) => {
    setOpenSubmenus(prev => new Set([...prev, submenuId]))
  }, [])

  const handleSubmenuMouseLeave = useCallback((submenuId: string) => {
    setOpenSubmenus(prev => {
      const newSet = new Set(prev)
      newSet.delete(submenuId)
      return newSet
    })
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
        setOpenSubmenus(new Set())
      }
    }

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeMenu])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt key opens/closes menu
      if (event.altKey && !event.ctrlKey && !event.shiftKey) {
        if (event.key === 'Alt') {
          event.preventDefault()
          setActiveMenu(activeMenu ? null : 'file')
        }
      }

      // Escape closes menu
      if (event.key === 'Escape' && activeMenu) {
        setActiveMenu(null)
        setOpenSubmenus(new Set())
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeMenu])

  const renderSubmenu = useCallback((items: MenuAction[], depth: number = 0): React.ReactNode => {
    return (
      <div className={`menu-submenu depth-${depth}`}>
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={`separator-${index}`} className="menu-separator" />
          }

          const hasSubmenu = item.submenu && item.submenu.length > 0
          const isOpen = openSubmenus.has(item.id)

          return (
            <div
              key={item.id}
              className={`menu-item ${item.disabled ? 'disabled' : ''} ${hasSubmenu ? 'has-submenu' : ''}`}
              onClick={(e) => handleMenuItemClick(item, e)}
              onMouseEnter={() => hasSubmenu && handleSubmenuMouseEnter(item.id)}
              onMouseLeave={() => hasSubmenu && handleSubmenuMouseLeave(item.id)}
            >
              <div className="menu-item-content">
                {item.icon && <span className="menu-item-icon">{item.icon}</span>}
                <span className="menu-item-label">{item.label}</span>
                {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
                {hasSubmenu && <span className="menu-item-arrow">▶</span>}
              </div>
              
              {hasSubmenu && isOpen && (
                <div className="menu-submenu-container">
                  {renderSubmenu(item.submenu!, depth + 1)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }, [openSubmenus, handleMenuItemClick, handleSubmenuMouseEnter, handleSubmenuMouseLeave])

  return (
    <div ref={menuRef} className={`main-menu ${className}`}>
      <div className="menu-bar">
        {MENU_STRUCTURE.map((menu) => (
          <div
            key={menu.id}
            className={`menu-item-root ${activeMenu === menu.id ? 'active' : ''}`}
            onClick={() => handleMenuClick(menu.id)}
            onMouseEnter={() => handleMouseEnter(menu.id)}
          >
            {menu.label}
            
            {activeMenu === menu.id && menu.submenu && (
              <div className="menu-dropdown">
                {renderSubmenu(menu.submenu)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MainMenu