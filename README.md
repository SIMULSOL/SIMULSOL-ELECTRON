# SIMULSOL

A comprehensive desktop development environment specifically designed for Solana blockchain development. Built on Electron with React and TypeScript, Solana IDE provides developers with all the tools they need to build, test, and deploy Solana programs efficiently.

![SIMULSOL Screenshot](resources/screenshot.png)

## Features

### 🚀 Solana-First Development
- **Project Templates**: Quick-start templates for Anchor, native, and token programs
- **Solana CLI Integration**: Built-in Solana CLI commands with auto-completion
- **Program Deployment**: Deploy directly to devnet, testnet, or mainnet
- **Wallet Integration**: Connect and manage Solana wallets

### 📝 Advanced Code Editing
- **Rust Language Support**: Full Rust syntax highlighting and IntelliSense
- **Solana-Specific Features**: Syntax highlighting for Solana macros and attributes
- **Auto-completion**: Smart completion for Solana Program Library functions
- **Error Detection**: Real-time compilation error detection with inline markers
- **Code Formatting**: Automatic Rust code formatting on save

### 🔧 Integrated Build Tools
- **One-Click Compilation**: Compile Solana programs with visual progress tracking
- **Build Artifacts**: Automatic generation and management of program artifacts
- **IDL Generation**: Automatic Interface Description Language file generation for Anchor programs
- **Clean Builds**: Full rebuild capabilities with artifact cleanup

### 🧪 Testing & Debugging
- **Test Runner**: Execute Solana program tests with real-time results
- **Local Validator**: Automatic local validator management for testing
- **Test Debugging**: Debug tests with breakpoints and variable inspection
- **Coverage Reports**: Test coverage analysis and reporting

### 💻 Integrated Terminal
- **Multiple Terminals**: Support for multiple terminal sessions
- **Solana CLI**: Pre-configured with Solana development tools
- **Command History**: Persistent command history across sessions
- **Auto-completion**: Smart completion for Solana CLI commands

### 📁 Project Management
- **File Explorer**: Intuitive project file navigation
- **Workspace Management**: Save and restore development sessions
- **Recent Projects**: Quick access to recently opened projects
- **File Watching**: Automatic detection of file changes

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable version)
- **Solana CLI** (v1.14 or higher)
- **Anchor Framework** (optional, for Anchor projects)

### Installation

#### Download Release
Download the latest release for your platform:
- [Windows](https://github.com/your-org/solana-ide/releases/latest/download/solana-ide-setup.exe)
- [macOS](https://github.com/your-org/solana-ide/releases/latest/download/solana-ide.dmg)
- [Linux](https://github.com/your-org/solana-ide/releases/latest/download/solana-ide.AppImage)

#### Build from Source
```bash
# Clone the repository
git clone https://github.com/your-org/solana-ide.git
cd solana-ide

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Quick Start

1. **Create a New Project**
   - Click "File" → "New Project - Choose from Anchor, Native, or Token program templates
   - Select your project location

2. **Write Your Program**
   - Use the integrated editor with Solana-specific features
   - Leverage auto-completion and syntax highlighting

3. **Build and Test**
   - Press `Ctrl+Shift+B` to build your program
   - Use `Ctrl+Shift+T` to run tests

4. **Deploy**
   - Confi your target network
   - Deploy with one click from the deployment panel

## Development

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── ipc/        # IPC handlers
│   └── services/   # Backend services
├── preload/        # Preload scripts
├── renderer/       # React frontend
│   ├── components/ # UI components
│   ├── services/   # Frontend services
│   └── types/      # Type definitions
└── shared/         # Shared utilities
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm start           # Preview built application

# Building
npm run build       # Full build with type checking
npm run typecheck   # Type check all files

# Testing
npm test           # Run all tests
npm run test:watch # Run tests in watch mode

# Code Quality
npm run lint       # Lint all files
npm run format     # Format code with Prettier

# Distribution
npm run build:win    # Build Windows installer
npm run build:mac    # Build macOS app
npm run build:linux  # Build Linux package
```

### Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Start development environment
npm run dev

# Run tests
npm test

# Lint and format code
npm run lint
npm run format
```

## Architecture

Solana IDE is built using modern web technologies:

- **Electron**: Cross-platform desktop application framework
- **React**: User interface library with hooks and context
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and development server
- **Vitest**: Modern testing framework

### Multi-Process Architecture

- **Main Process**: Handles file system operations, external processes, and system integration
- **Renderer Process**: Manages the UI, code editing, and user in
- **Preload Scripts**: Secure bridge for main-renderer communication

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New Project | `Ctrl+Shift+N` | `Cmd+Shift+N` |
| Open Project | `Ctrl+O` | `Cmd+O` |
| Save File | `Ctrl+S` | `Cmd+S` |
| Build Program | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| Run Tests | `Ctrl+Shift+T` | `Cmd+Shift+T` |
| Toggle Terminal | `Ctrl+`` | `Cmd+`` |
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |

## System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.14, or Ubuntu 18.04
- **RAM**: 4 GB
- **Storage**: 2 GB available space
- **CPU**: Intel Core i3 or equivalent

### Recommended Requirements
- **OS**: Windows 11, macOS 12, or Ubuntu 20.04
- **RAM**: 8 GB or more
- **Storage**: 4 GB available space
- **CPU**: Intel Core i5 or equivalent

## Troubleshooting

### Common Issues

**IDE won't start**
- Ensure Node.js v18+ is installed
- Check that all dependencies are installed: `npm install`

**Compilation errors**
- Verify Rust toolchain is installed and up to date
- Check that Solana CLI is properly configured

**Tests failing**
- Ensure local validator is running
- Check that test dependencies are installed

### Getting Help

- 📖 [Documentation](https://docs.solana-ide.dev)
- 💬 [Discord Community](https://discord.gg/solana-ide)
- 🐛 [Report Issues](https://github.com/your-org/solana-ide/issues)
- 📧 [Contact Support](mailto:support@solana-ide.dev)

## License

This project is licensed under the MIT License -he [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Solana Labs](https://solana.com) for the Solana blockchain platform
- [Anchor Framework](https://anchor-lang.com) for Solana program development
- [Electron](https://elect.org) for the desktop application framework
- [React](https://reactjs.org) for the user interface library

---

**Built with ❤️ for the Solana developer community**