# Contributing to Solana IDE

Thank you for your interest in contributing to Solana IDE! We welcome contributions from the community and are excited to work with you to make Solana development more accessible and efficient.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@solana-ide.dev](mailto:conduct@solana-ide.dev).

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Git**
- **Rust** (latest stable version)
- **Solana CLI** (v1.14 or higher)

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/solana-ide.git
   cd solana-ide
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/your-org/solana-ide.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Verify setup**
   ```bash
   # Run tests to ensure everything is working
   npm test
   
   # Check code quality
   npm run lint
   npm run typecheck
   ```

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/your-org/solana-ide/issues) to avoid duplicates.

When creating a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details**:
  - OS version
  - Node.js version
  - Solana IDE version
  - Solana CLI version

Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

### Suggesting Features

We welcome feature suggestions! Please:

1. Check [existing feature requests](https://github.com/your-org/solana-ide/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
2. Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. Provide detailed use cases and rationale
4. Consider implementation complexity and maintenance burden

### Contributing Code

#### Types of Contributions

- **Bug fixes**: Fix existing issues
- **Features**: Implement new functionality
- **Performance**: Optimize existing code
- **Documentation**: Improve docs and examples
- **Tests**: Add or improve test coverage
- **Refactoring**: Improve code structure without changing behavior

#### Before You Start

1. **Check existing issues** for similar work
2. **Create an issue** to discuss major changes
3. **Get feedback** from maintainers before starting large features
4. **Keep changes focused** - one feature/fix per PR

## Pull Request Process

### 1. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Follow our [coding standards](#coding-standards)
- Write tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Check TypeScript types
npm run typecheck

# Lint your code
npm run lint

# Format your code
npm run format
```

### 4. Commit Your Changes

We use [Conventional Commits](https://conventionalcommits.org/) for commit messages:

```bash
# Examples
git commit -m "feat: add Anchor project template support"
git commit -m "fix: resolve terminal output formatting issue"
git commit -m "docs: update installation instructions"
git commit -m "test: add unit tests for ProjectExplorer component"
```

**Commit Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

### 5. Push and Create PR

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a pull request on GitHub
```

### 6. PR Requirements

Your pull request must:

- [ ] Pass all automated checks (tests, linting, type checking)
- [ ] Include tests for new functionality
- [ ] Update documentation if needed
- [ ] Have a clear description of changes
- [ ] Reference related issues
- [ ] Be up to date with the main branch

### 7. Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** on multiple platforms if needed
4. **Approval** from at least one maintainer
5. **Merge** by maintainers

## Coding Standards

### TypeScript

- Use **TypeScript** for all new code
- Provide proper type annotations
- Avoid `any` types - use specific types or `unknown`
- Use interfaces for object shapes
- Export types from appropriate modules

```typescript
// Good
interface ProjectConfig {
  name: string;
  type: 'anchor' | 'native' | 'token';
  path: string;
}

// Avoid
const config: any = { ... };
```

### React Components

- Use **functional components** with hooks
- Use **TypeScript** for prop types
- Keep components focused and single-purpose
- Use custom hooks for complex logic
- Follow naming conventions

```typescript
// Good
interface ProjectExplorerProps {
  projectPath: string;
  onFileSelect: (filePath: string) => void;
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  projectPath,
  onFileSelect
}) => {
  // Component implementation
};
```

### File Organization

- **Components**: PascalCase (e.g., `ProjectExplorer.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useProjectExplorer.ts`)
- **Services**: PascalCase with suffix (e.g., `FileSystemManager.ts`)
- **Types**: PascalCase (e.g., `Project.ts`)
- **Tests**: Same name as tested file with `.test.ts` extension

### Code Style

We use **Prettier** for code formatting and **ESLint** for linting:

```bash
# Format code
npm run format

# Check linting
npm run lint

# Fix linting issues
npm run lint -- --fix
```

## Testing Guidelines

### Test Structure

- **Unit tests**: Test individual functions and components
- **Integration tests**: Test component interactions
- **E2E tests**: Test complete user workflows

### Writing Tests

```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { ProjectExplorer } from '../ProjectExplorer';

describe('ProjectExplorer', () => {
  it('should display project files', () => {
    render(<ProjectExplorer projectPath="/test/project" onFileSelect={jest.fn()} />);
    
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('Cargo.toml')).toBeInTheDocument();
  });
});
```

### Test Requirements

- **New features** must include tests
- **Bug fixes** should include regression tests
- **Aim for high coverage** but focus on critical paths
- **Use descriptive test names** that explain the scenario
- **Mock external dependencies** appropriately

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- ProjectExplorer.test.tsx
```

## Documentation

### Code Documentation

- Use **JSDoc** for functions and classes
- Document complex algorithms and business logic
- Keep comments up to date with code changes

```typescript
/**
 * Compiles a Solana program using the appropriate toolchain
 * @param projectPath - Path to the project root directory
 * @param options - Compilation options
 * @returns Promise resolving to compilation result
 */
async function compileProgram(
  projectPath: string, 
  options: CompileOptions
): Promise<CompileResult> {
  // Implementation
}
```

### README Updates

- Update feature lists for new functionality
- Add new configuration options
- Update installation instructions if needed
- Keep examples current

### API Documentation

- Document public APIs and interfaces
- Provide usage examples
- Document breaking changes in CHANGELOG.md

## Community

### Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/solana-ide) for real-time discussion
- **GitHub Discussions**: Use [GitHub Discussions](https://github.com/your-org/solana-ide/discussions) for questions and ideas
- **Issues**: Create [GitHub issues](https://github.com/your-org/solana-ide/issues) for bugs and feature requests

### Communication Guidelines

- Be respectful and inclusive
- Provide context and details
- Search existing discussions before posting
- Use appropriate channels for different types of communication

### Recognition

Contributors are recognized in:
- **CONTRIBUTORS.md** file
- **Release notes** for significant contributions
- **GitHub contributors** page
- **Discord contributor** role

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Schedule

- **Patch releases**: As needed for critical fixes
- **Minor releases**: Monthly feature releases
- **Major releases**: Quarterly with breaking changes

## Questions?

If you have questions about contributing, please:

1. Check this document and existing issues
2. Ask in our [Discord server](https://discord.gg/solana-ide)
3. Create a [GitHub Discussion](https://github.com/your-org/solana-ide/discussions)
4. Email us at [contributors@solana-ide.dev](mailto:contributors@solana-ide.dev)

Thank you for contributing to Solana IDE! 🚀