import React, { useState, useEffect, useCallback } from 'react'
import './CustomHeader.css'
import Logo from '../../assets/simusol_bg_transparent.png'
export interface CustomHeaderProps {
  title?: string
  onAction?: (actionId: string) => void
  className?: string
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({ 
  title = 'SIMUSOL', 
  onAction,
  className = '' 
}) => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  // Update navigation state
  const updateNavigationState = useCallback(async () => {
    try {
      const [backState, forwardState] = await Promise.all([
        window.api.navigation.canGoBack(),
        window.api.navigation.canGoForward()
      ])
      setCanGoBack(backState)
      setCanGoForward(forwardState)
    } catch (error) {
      console.error('Failed to update navigation state:', error)
    }
  }, [])

  // Update window state
  const updateWindowState = useCallback(async () => {
    try {
      const maximized = await window.api.window.isMaximized()
      setIsMaximized(maximized)
    } catch (error) {
      console.error('Failed to update window state:', error)
    }
  }, [])

  // Initialize states
  useEffect(() => {
    updateNavigationState()
    updateWindowState()

    // Update navigation state periodically
    const interval = setInterval(updateNavigationState, 1000)
    return () => clearInterval(interval)
  }, [updateNavigationState, updateWindowState])

  // Window control handlers
  const handleMinimize = useCallback(async () => {
    try {
      await window.api.window.minimize()
    } catch (error) {
      console.error('Failed to minimize window:', error)
    }
  }, [])

  const handleMaximize = useCallback(async () => {
    try {
      await window.api.window.maximize()
      await updateWindowState()
    } catch (error) {
      console.error('Failed to maximize window:', error)
    }
  }, [updateWindowState])

  const handleClose = useCallback(async () => {
    try {
      await window.api.window.close()
    } catch (error) {
      console.error('Failed to close window:', error)
    }
  }, [])

  // Navigation handlers
  const handleBack = useCallback(async () => {
    try {
      const success = await window.api.navigation.back()
      if (success) {
        await updateNavigationState()
        onAction?.('navigation.back')
      }
    } catch (error) {
      console.error('Failed to navigate back:', error)
    }
  }, [updateNavigationState, onAction])

  const handleForward = useCallback(async () => {
    try {
      const success = await window.api.navigation.forward()
      if (success) {
        await updateNavigationState()
        onAction?.('navigation.forward')
      }
    } catch (error) {
      console.error('Failed to navigate forward:', error)
    }
  }, [updateNavigationState, onAction])

  const handleReload = useCallback(async () => {
    try {
      await window.api.navigation.reload()
      onAction?.('navigation.reload')
    } catch (error) {
      console.error('Failed to reload:', error)
    }
  }, [onAction])

  return (
    <div className={`custom-header ${className}`}>
      {/* Left section - Navigation buttons */}
      <div className="header-left">
        <div className="navigation-buttons">
          <button
            className={`nav-button back-button ${!canGoBack ? 'disabled' : ''}`}
            onClick={handleBack}
            disabled={!canGoBack}
            title="Go back"
            aria-label="Go back"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.5 2.5L7 4l4 4-4 4 1.5 1.5L14 8l-5.5-5.5z" transform="rotate(180 8 8)" />
            </svg>
          </button>
          
          <button
            className={`nav-button forward-button ${!canGoForward ? 'disabled' : ''}`}
            onClick={handleForward}
            disabled={!canGoForward}
            title="Go forward"
            aria-label="Go forward"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.5 2.5L7 4l4 4-4 4 1.5 1.5L14 8l-5.5-5.5z" />
            </svg>
          </button>

          <button
            className="nav-button reload-button"
            onClick={handleReload}
            title="Reload"
            aria-label="Reload"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a6 6 0 0 1 6 6h-2a4 4 0 0 0-4-4V2z"/>
              <path d="M2 8a6 6 0 0 1 6-6v2a4 4 0 0 0-4 4H2z"/>
              <path d="M8 14a6 6 0 0 1-6-6h2a4 4 0 0 0 4 4v2z"/>
              <path d="M14 8a6 6 0 0 1-6 6v-2a4 4 0 0 0 4-4h2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Center section - Title and drag area */}
      <div className="header-center">
        <img width={30} height={30} src={Logo}/>
        <div className="app-title">{title}</div>
      </div>

      {/* Right section - Window controls */}
      <div className="header-right">
        <div className="window-controls">
          <button
            className="window-control minimize-button"
            onClick={handleMinimize}
            title="Minimize"
            aria-label="Minimize window"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="2" y="5.5" width="8" height="1" />
            </svg>
          </button>

          <button
            className="window-control maximize-button"
            onClick={handleMaximize}
            title={isMaximized ? "Restore" : "Maximize"}
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1" fill="none" />
                <rect x="4" y="4" width="6" height="6" stroke="currentColor" strokeWidth="1" fill="none" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none" />
              </svg>
            )}
          </button>

          <button
            className="window-control close-button"
            onClick={handleClose}
            title="Close"
            aria-label="Close window"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomHeader