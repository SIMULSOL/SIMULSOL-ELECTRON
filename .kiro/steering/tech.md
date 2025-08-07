# Technology Stack

## Core Technologies

- **Electron**: Desktop application framework (v37.2.3)
- **React**: UI framework (v19.1.0) with React DOM
- **TypeScript**: Primary language for type safety
- **Vite**: Build tool via electron-vite for fast development
- **Node.js**: Runtime environment

## Build System

- **electron-vite**: Main build system with separate configs for main, preload, and renderer processes
- **Vite**: Powers the renderer process with React plugin
- **TypeScript Compiler**: Separate compilation for node and web targets
- **electron-builder**: Application packaging and distribution

## Development Tools

- **ESLint**: Code linting with Electron Toolkit configs
- **Prettier**: Code formatting
- **Vitest**: Testing framework with jsdom environment
- **React Testing Library**: Component testing utilities

## Architecture

- **Multi-process**: Separate main process (Node.js) and renderer process (Chromium)
- **IPC Communication**: Inter-process communication between main and renderer
- **Path Aliases**: `@renderer` alias for renderer source files

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm start           # Preview built application
```

### Building
```bash
npm run build       # Full build with type checking
npm run typecheck   # Type check all TypeScript files
```

### Testing
```bash
npm test           # Run all tests once
npm run test:watch # Run tests in watch mode
```

### Code Quality
```bash
npm run lint       # Lint all files
npm run format     # Format all files with Prettier
```

### Distribution
```bash
npm run build:win    # Build Windows installer
npm run build:mac    # Build macOS app
npm run build:linux  # Build Linux package
npm run build:unpack # Build unpacked directory
```

## Configuration Files

- `electron.vite.config.ts`: Main build configuration
- `tsconfig.json`: TypeScript project references
- `tsconfig.node.json`: Node.js/Electron main process config
- `tsconfig.web.json`: Web/renderer process config
- `vitest.config.ts`: Test configuration
- `eslint.config.mjs`: Linting rules