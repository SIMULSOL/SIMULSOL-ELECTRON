# Project Structure

## Root Directory

- **Configuration Files**: TypeScript configs, build configs, and tooling setup at root level
- **Source Code**: All application code in `src/` directory
- **Resources**: Application assets in `resources/` directory
- **Build Output**: Generated files in `out/` and `build/` directories (not tracked)

## Source Code Organization (`src/`)

### Multi-Process Architecture

The application follows Electron's multi-process architecture with clear separation:

```
src/
├── main/           # Main process (Node.js/Electron backend)
├── preload/        # Preload scripts (secure IPC bridge)
├── renderer/       # Renderer process (React frontend)
├── shared/         # Shared code between processes
├── index.ts        # Application entry point
└── test-setup.ts   # Test configuration
```

### Main Process (`src/main/`)

Backend services and system integration:

- `index.ts`: Main process entry point and window management
- `ipc/`: Inter-process communication handlers
- `services/`: Core backend services (FileSystemManager, ProcessManager, WorkspaceManager)
- `types/`: Main process specific TypeScript types

### Preload (`src/preload/`)

Secure bridge between main and renderer processes:

- `index.ts`: Preload script entry point
- `IPCClient.ts`: Client-side IPC communication wrapper
- `index.d.ts`: Type definitions for exposed APIs
- `__tests__/`: Preload-specific tests

### Renderer (`src/renderer/`)

React-based frontend application:

```
src/renderer/
├── index.html      # HTML entry point
└── src/
    ├── components/ # React components organized by feature
    ├── services/   # Frontend services and utilities
    ├── types/      # Renderer-specific TypeScript types
    └── utils/      # Utility functions
```

#### Component Organization

Components are organized by feature/domain:

- `layout/`: IDE layout management (IDELayoutManager, LayoutContext)
- `menu/`: Application menus and toolbars (MainMenu, Toolbar, KeyboardShortcuts)
- `explorer/`: Project file explorer (ProjectExplorer, useProjectExplorer)
- `editor/`: Code editing components
- `terminal/`: Integrated terminal components

### Shared (`src/shared/`)

Code shared between main and renderer processes:

- `types/`: Common TypeScript interfaces and types
- `utils/`: Shared utility functions (especially IPC utilities)

## File Naming Conventions

- **Components**: PascalCase (e.g., `ProjectExplorer.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useProjectExplorer.ts`)
- **Services**: PascalCase with descriptive suffix (e.g., `LayoutPersistenceService.ts`)
- **Types**: PascalCase (e.g., `Common.ts`, `Layout.ts`)
- **Tests**: Same name as tested file with `.test.ts` or `.test.tsx` extension
- **CSS**: Same name as component with `.css` extension

## Testing Structure

Tests are co-located with source files in `__tests__/` directories:

- Unit tests for individual components and services
- Integration tests for IPC communication
- End-to-end tests for complete workflows
- Test setup and configuration in `src/test-setup.ts`

## Key Architectural Patterns

- **Service Layer**: Backend services handle system operations
- **Component-Hook Pattern**: React components paired with custom hooks for logic
- **IPC Abstraction**: Clean abstraction layer for main-renderer communication
- **Type Safety**: Comprehensive TypeScript types across all processes
- **Test Co-location**: Tests placed near the code they test for maintainability