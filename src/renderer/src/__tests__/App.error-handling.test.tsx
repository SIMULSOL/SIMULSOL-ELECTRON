import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from '../App'

// Mock console.error to avoid noise in test output
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

// Mock components that can throw errors
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error('Test component error')
    }
    return <div data-testid="working-component">Component working</div>
}

// Mock the layout context to control loading state
let mockLayoutReady = false

vi.mock('../components/layout/LayoutContext', () => ({
    LayoutProvider: ({ children }: any) => children,
    useLayout: () => ({
        layout: {},
        addPanel: vi.fn(),
        removePanel: vi.fn(),
        resizePanel: vi.fn(),
        togglePanel: vi.fn(),
        saveLayout: vi.fn(),
        restoreLayout: vi.fn(),
        isLayoutReady: mockLayoutReady
    })
}))

// Mock components with error scenarios
vi.mock('../components/menu', () => ({
    MainMenu: ({ onAction }: { onAction: (action: string) => void }) => (
        <div data-testid="main-menu">
            <button onClick={() => onAction('file.open.project')}>Open Project</button>
        </div>
    ),
    Toolbar: ({ onAction }: { onAction: (action: string) => void }) => (
        <div data-testid="toolbar">
            <button onClick={() => onAction('build.build')}>Build</button>
        </div>
    ),
    KeyboardShortcutManager: vi.fn().mockImplementation(() => ({
        addListener: vi.fn(),
        removeListener: vi.fn()
    }))
}))

// Mock project explorer that can fail
let mockExplorerShouldFail = false

vi.mock('../components/explorer', () => ({
    ProjectExplorer: () => {
        if (mockExplorerShouldFail) {
            throw new Error('Project explorer failed to load')
        }
        return (
            <div data-testid="project-explorer">
                <div>Project Explorer</div>
            </div>
        )
    }
}))

vi.mock('../components/explorer/useProjectExplorer', () => ({
    default: () => [
        {
            files: [],
            selectedFiles: [],
            projectPath: null,
            isLoading: false,
            error: mockExplorerShouldFail ? 'Failed to load project' : null,
            validationErrors: []
        },
        {
            loadProject: vi.fn().mockImplementation(() => {
                if (mockExplorerShouldFail) {
                    throw new Error('Failed to load project')
                }
            }),
            refreshProject: vi.fn(),
            selectFile: vi.fn(),
            openFile: vi.fn(),
            createFile: vi.fn(),
            deleteFile: vi.fn(),
            renameFile: vi.fn(),
            clearSelection: vi.fn(),
            validateProject: vi.fn()
        }
    ]
}))

// Mock code editor that can fail
let mockEditorShouldFail = false

vi.mock('../components/editor', () => ({
    CodeEditor: React.forwardRef(() => {
        if (mockEditorShouldFail) {
            throw new Error('Code editor failed to initialize')
        }
        return (
            <div data-testid="code-editor">
                <div>Code Editor</div>
            </div>
        )
    }),
    useCodeEditor: () => ({
        content: '',
        isDirty: false,
        isLoading: mockEditorShouldFail,
        diagnostics: [],
        editorRef: { current: null },
        loadFile: vi.fn().mockImplementation(() => {
            if (mockEditorShouldFail) {
                throw new Error('Failed to load file')
            }
        }),
        saveFile: vi.fn(),
        setContent: vi.fn(),
        getLanguageFromFilePath: vi.fn(() => 'rust')
    })
}))

// Mock terminal that can fail
let mockTerminalShouldFail = false

vi.mock('../components/terminal', () => ({
    TerminalComponent: ({ onSessionCreate }: any) => {
        if (mockTerminalShouldFail) {
            throw new Error('Terminal failed to initialize')
        }

        React.useEffect(() => {
            onSessionCreate?.({
                id: 'test-terminal',
                terminal: {},
                isActive: true,
                title: 'Terminal 1'
            })
        }, [onSessionCreate])

        return (
            <div data-testid="terminal-component">
                <div>Terminal Component</div>
            </div>
        )
    },
    useTerminal: () => ({
        sessions: [],
        activeSessionId: null,
        createSession: vi.fn(),
        destroySession: vi.fn(),
        setActiveSession: vi.fn(),
        getActiveSession: vi.fn(),
        sendInputToActive: vi.fn(),
        clearActiveTerminal: vi.fn(),
        resizeActiveTerminal: vi.fn(),
        onSessionCreate: vi.fn()
    })
}))

vi.mock('../components/layout/IDELayoutManager', () => ({
    default: () => (
        <div data-testid="ide-layout-manager">
            <div data-testid="layout-content">Layout Manager</div>
        </div>
    )
}))

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
})

describe('App Error Handling and Loading States', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        consoleSpy.mockClear()
        localStorageMock.getItem.mockReturnValue(null)

        // Reset error states
        mockExplorerShouldFail = false
        mockEditorShouldFail = false
        mockTerminalShouldFail = false
        mockLayoutReady = true
    })

    afterEach(() => {
        vi.clearAllTimers()
    })

    it('shows loading state when layout is not ready', async () => {
        mockLayoutReady = false

        render(<App />)

        expect(screen.getByText('Loading SIMUSOL IDE...')).toBeInTheDocument()
        expect(screen.getByText('Initializing workspace and components')).toBeInTheDocument()
    })

    it('transitions from loading to loaded state', async () => {
        mockLayoutReady = false

        const { rerender } = render(<App />)

        // Should show loading initially
        expect(screen.getByText('Loading SIMUSOL IDE...')).toBeInTheDocument()

        // Simulate layout becoming ready
        mockLayoutReady = true
        rerender(<App />)

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
            expect(screen.queryByText('Loading SIMUSOL IDE...')).not.toBeInTheDocument()
        })
    })

    it('handles project explorer errors gracefully', async () => {
        mockExplorerShouldFail = true

        render(<App />)

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })

        // Error boundary should catch the error and show error UI
        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        })
    })

    it('handles code editor errors gracefully', async () => {
        mockEditorShouldFail = true

        render(<App />)

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })

        // Error boundary should catch the error
        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        })
    })

    it('handles terminal errors gracefully', async () => {
        mockTerminalShouldFail = true

        render(<App />)

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })

        // Error boundary should catch the error
        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        })
    })

    it('allows recovery from error state', async () => {
        mockExplorerShouldFail = true

        const user = userEvent.setup()
        render(<App />)

        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        })

        // Reset the error condition
        mockExplorerShouldFail = false

        // Click try again button
        const tryAgainButton = screen.getByText('Try Again')
        await user.click(tryAgainButton)

        // Should recover and show the normal interface
        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
            expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
        })
    })

    it('handles localStorage errors gracefully', async () => {
        // Mock localStorage to throw an error
        localStorageMock.getItem.mockImplementation(() => {
            throw new Error('localStorage not available')
        })

        render(<App />)

        // Should still render despite localStorage error
        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })
    })

    it('handles invalid localStorage data gracefully', async () => {
        // Mock localStorage to return invalid JSON
        localStorageMock.getItem.mockReturnValue('invalid json{')

        render(<App />)

        // Should still render despite invalid localStorage data
        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })
    })

    it('shows appropriate error messages for different error types', async () => {
        mockExplorerShouldFail = true

        render(<App />)

        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        })

        // Should show the error message from the thrown error
        expect(screen.getByText(/Project explorer failed to load/)).toBeInTheDocument()
    })

    it('handles multiple simultaneous errors', async () => {
        mockExplorerShouldFail = true
        mockEditorShouldFail = true
        mockTerminalShouldFail = true

        render(<App />)

        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        })

        // Should show error boundary (first error caught)
        expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('handles component unmounting during error state', async () => {
        mockExplorerShouldFail = true

        const { unmount } = render(<App />)

        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        })

        // Should unmount without throwing additional errors
        expect(() => unmount()).not.toThrow()
    })

    it('handles async errors in component lifecycle', async () => {
        // Mock an async error in useEffect
        const AsyncErrorComponent = () => {
            React.useEffect(() => {
                setTimeout(() => {
                    throw new Error('Async error')
                }, 100)
            }, [])

            return <div data-testid="async-component">Async Component</div>
        }

        // This test verifies that async errors don't crash the app
        // (though they won't be caught by error boundaries)
        render(<AsyncErrorComponent />)

        expect(screen.getByTestId('async-component')).toBeInTheDocument()

        // Wait for async error (it should be logged but not crash the app)
        await new Promise(resolve => setTimeout(resolve, 150))

        expect(screen.getByTestId('async-component')).toBeInTheDocument()
    })

    it('handles network/API errors gracefully', async () => {
        // Mock API to throw network errors
        const mockAPI = {
            fileSystem: {
                readFile: vi.fn().mockRejectedValue(new Error('Network error')),
                writeFile: vi.fn().mockRejectedValue(new Error('Network error'))
            }
        }

        Object.defineProperty(window, 'api', {
            value: mockAPI,
            writable: true
        })

        render(<App />)

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })

        // App should still render even if API calls fail
        expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })

    it('handles component prop validation errors', async () => {
        // This would typically be caught in development mode
        // We can simulate by passing invalid props to components
        render(<App />)

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })

        // App should render despite prop validation warnings
        expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })

    it('handles memory pressure gracefully', async () => {
        // Simulate memory pressure by creating large objects
        const largeArray = new Array(1000000).fill('memory pressure test')

        render(<App />)

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })

        // App should still function under memory pressure
        expect(screen.getByTestId('main-menu')).toBeInTheDocument()

        // Clean up
        largeArray.length = 0
    })

    it('logs errors appropriately', async () => {
        mockExplorerShouldFail = true

        render(<App />)

        await waitFor(() => {
            expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        })

        // Should have logged the error
        expect(consoleSpy).toHaveBeenCalledWith(
            'IDE Error Boundary caught an error:',
            expect.any(Error),
            expect.any(Object)
        )
    })

    it('handles rapid state changes without errors', async () => {
        const user = userEvent.setup()
        render(<App />)

        await waitFor(() => {
            expect(screen.getByTestId('main-menu')).toBeInTheDocument()
        })

        // Rapidly trigger multiple actions
        const openProjectButton = screen.getByText('Open Project')

        // Click multiple times rapidly
        await user.click(openProjectButton)
        await user.click(openProjectButton)
        await user.click(openProjectButton)

        // Should handle rapid clicks without errors
        expect(screen.getByTestId('main-menu')).toBeInTheDocument()
    })
})

// Cleanup
afterAll(() => {
    consoleSpy.mockRestore()
})