# AsterMind ELM: Technical Requirements

This document outlines the technical requirements for running AsterMind ELM on Windows, Linux, and macOS. AsterMind ELM is a JavaScript/TypeScript library that runs in both browser and Node.js environments.

---

## Table of Contents

1. [Overview](#overview)
2. [Windows Requirements](#windows-requirements)
3. [Linux Requirements](#linux-requirements)
4. [macOS Requirements](#macos-requirements)
5. [Browser Requirements](#browser-requirements)
6. [Development Requirements](#development-requirements)
7. [Runtime Requirements](#runtime-requirements)
8. [Optional Dependencies](#optional-dependencies)
9. [Platform-Specific Notes](#platform-specific-notes)
10. [Troubleshooting](#troubleshooting)

---

## Overview

AsterMind ELM is a pure JavaScript/TypeScript library with **no native dependencies**. It requires:
- **No GPU** — runs entirely on CPU
- **No special hardware** — works on any modern computer
- **No external services** — runs entirely on-device
- **Minimal memory** — models are typically measured in KB

The library is designed to work in:
- **Browser environments** (via CDN or bundler)
- **Node.js environments** (server-side applications)
- **Web Workers** (background processing)

---

## Windows Requirements

### Minimum Requirements

- **Operating System**: Windows 10 (version 1809 or later) or Windows 11
- **Node.js**: Version 18.0.0 or higher (LTS recommended: 20.x or 22.x)
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **Memory**: 4 GB RAM minimum (8 GB recommended for development)
- **Disk Space**: 500 MB free space (for node_modules and build artifacts)

### Recommended Setup

1. **Install Node.js**:
   - Download from [nodejs.org](https://nodejs.org/)
   - Choose the LTS version (20.x or 22.x)
   - Verify installation:
     ```powershell
     node --version  # Should show v18.0.0 or higher
     npm --version   # Should show 9.0.0 or higher
     ```

2. **Package Manager Options**:
   - **npm** (included with Node.js)
   - **pnpm** (recommended for faster installs):
     ```powershell
     npm install -g pnpm
     ```
   - **yarn** (alternative):
     ```powershell
     npm install -g yarn
     ```

3. **Development Tools** (optional):
   - **Git**: For cloning the repository
   - **VS Code**: Recommended IDE with TypeScript support
   - **Windows Terminal**: Improved terminal experience

### Windows-Specific Considerations

- **Path Length**: Windows has a 260-character path limit. If you encounter issues, enable long paths:
  - Run PowerShell as Administrator
  - Execute: `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force`
  - Restart your computer

- **File Permissions**: Some npm operations may require elevated permissions. If you encounter permission errors, run your terminal as Administrator.

- **Line Endings**: Git on Windows may convert line endings. Configure Git:
  ```powershell
  git config --global core.autocrlf true
  ```

### Installation on Windows

```powershell
# Clone the repository (if developing)
git clone https://github.com/infiniteCrank/AsterMind-ELM.git
cd AsterMind-ELM

# Install dependencies
npm install
# or
pnpm install

# Build the library
npm run build

# Run examples
npm run dev
```

---

## Linux Requirements

### Minimum Requirements

- **Operating System**: Any modern Linux distribution (Ubuntu 20.04+, Debian 11+, Fedora 35+, etc.)
- **Node.js**: Version 18.0.0 or higher (LTS recommended: 20.x or 22.x)
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **Memory**: 4 GB RAM minimum (8 GB recommended for development)
- **Disk Space**: 500 MB free space (for node_modules and build artifacts)
- **Build Tools**: `make`, `g++` (for native dependencies, if any)

### Recommended Setup

1. **Install Node.js**:

   **Using NodeSource (recommended)**:
   ```bash
   # For Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # For Fedora/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo dnf install -y nodejs
   ```

   **Using nvm (Node Version Manager)**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 20
   nvm use 20
   ```

   **Verify installation**:
   ```bash
   node --version  # Should show v18.0.0 or higher
   npm --version   # Should show 9.0.0 or higher
   ```

2. **Install Build Tools** (if not already installed):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y build-essential

   # Fedora/RHEL
   sudo dnf groupinstall -y "Development Tools"
   ```

3. **Package Manager Options**:
   - **npm** (included with Node.js)
   - **pnpm** (recommended):
     ```bash
     npm install -g pnpm
     ```
   - **yarn**:
     ```bash
     npm install -g yarn
     ```

### Linux-Specific Considerations

- **File Permissions**: Ensure your user has write permissions to the project directory and `node_modules`.

- **Python**: Some native dependencies may require Python 3. Node.js 18+ typically doesn't need Python, but if you encounter build errors, install:
  ```bash
  sudo apt-get install python3  # Ubuntu/Debian
  sudo dnf install python3      # Fedora/RHEL
  ```

- **OpenSSL**: Ensure OpenSSL is up to date (usually pre-installed):
  ```bash
  openssl version  # Should show 1.1.1 or higher
  ```

### Installation on Linux

```bash
# Clone the repository (if developing)
git clone https://github.com/infiniteCrank/AsterMind-ELM.git
cd AsterMind-ELM

# Install dependencies
npm install
# or
pnpm install

# Build the library
npm run build

# Run examples
npm run dev
```

---

## macOS Requirements

### Minimum Requirements

- **Operating System**: macOS 11.0 (Big Sur) or later (macOS 12+ recommended)
- **Node.js**: Version 18.0.0 or higher (LTS recommended: 20.x or 22.x)
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **Memory**: 4 GB RAM minimum (8 GB recommended for development)
- **Disk Space**: 500 MB free space (for node_modules and build artifacts)
- **Xcode Command Line Tools**: Required for building native dependencies (if any)

### Recommended Setup

1. **Install Node.js**:

   **Using Homebrew (recommended)**:
   ```bash
   # Install Homebrew if not already installed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # Install Node.js
   brew install node@20
   # or for latest LTS
   brew install node

   # Verify installation
   node --version  # Should show v18.0.0 or higher
   npm --version   # Should show 9.0.0 or higher
   ```

   **Using nvm (Node Version Manager)**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.zshrc  # or ~/.bash_profile
   nvm install 20
   nvm use 20
   ```

   **Direct Download**:
   - Download from [nodejs.org](https://nodejs.org/)
   - Install the macOS installer (.pkg file)

2. **Install Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
   This is required for building any native dependencies.

3. **Package Manager Options**:
   - **npm** (included with Node.js)
   - **pnpm** (recommended):
     ```bash
     npm install -g pnpm
     ```
   - **yarn**:
     ```bash
     npm install -g yarn
     ```

### macOS-Specific Considerations

- **Apple Silicon (M1/M2/M3)**: AsterMind ELM works natively on Apple Silicon. If you encounter issues with native dependencies, ensure you're using the ARM64 version of Node.js.

- **Rosetta 2**: Not required for AsterMind ELM, but may be needed for some development tools.

- **Gatekeeper**: macOS may block unsigned binaries. If you encounter permission errors:
  ```bash
  # Allow npm global binaries
   sudo spctl --master-disable  # Not recommended for security
   # Or allow specific apps in System Preferences > Security & Privacy
  ```

- **File Permissions**: macOS may restrict file access. Ensure your user has read/write permissions to the project directory.

### Installation on macOS

```bash
# Clone the repository (if developing)
git clone https://github.com/infiniteCrank/AsterMind-ELM.git
cd AsterMind-ELM

# Install dependencies
npm install
# or
pnpm install

# Build the library
npm run build

# Run examples
npm run dev
```

---

## Browser Requirements

AsterMind ELM works in modern browsers that support:
- **ES6+ JavaScript** (ES2015 or later)
- **Web Workers** (for background processing)
- **TypedArrays** (for efficient matrix operations)
- **ES Modules** (when using ESM builds)

### Supported Browsers

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support (macOS/iOS) |
| Edge | 90+ | Full support (Chromium-based) |
| Opera | 76+ | Full support |

### Browser-Specific Features

- **Web Workers**: Required for `ELMWorker` functionality. All modern browsers support this.
- **ES Modules**: Required when using ESM builds. All modern browsers support this.
- **TypedArrays**: Required for matrix operations. All modern browsers support this.

### Using in Browser

**Via CDN (UMD)**:
```html
<script src="https://cdn.jsdelivr.net/npm/@astermind/astermind-elm/dist/astermind.umd.js"></script>
<script>
  const { ELM, KernelELM } = window.astermind;
</script>
```

**Via Bundler (ESM)**:
```javascript
import { ELM, KernelELM } from '@astermind/astermind-elm';
```

---

## Development Requirements

To develop or build AsterMind ELM from source, you need:

### Required

- **Node.js**: 18.0.0 or higher (20.x LTS recommended)
- **npm**: 9.0.0 or higher (or pnpm/yarn)
- **TypeScript**: 5.8.3 (installed via npm)
- **Git**: For version control (if contributing)

### Build Tools

- **Rollup**: 4.43.0+ (bundler, installed via npm)
- **TypeScript Compiler**: 5.8.3+ (for type generation)
- **Vite**: 6.3.5+ (for development server, installed via npm)

### Development Scripts

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Build TypeScript types
npm run build:types

# Watch mode (rebuild on changes)
npm run watch

# Development server
npm run dev

# Run tests
npm test

# Clean build artifacts
npm run clean
```

---

## Runtime Requirements

### For End Users (Using the Library)

**Browser**:
- Any modern browser (see [Browser Requirements](#browser-requirements))
- No additional software needed
- Works offline (after initial load)

**Node.js**:
- Node.js 18.0.0 or higher
- No additional dependencies (all bundled)
- Works on any platform Node.js supports

### Memory Requirements

- **Minimum**: 4 GB RAM (for development)
- **Recommended**: 8 GB RAM (for comfortable development)
- **Runtime**: Models are tiny (KB), so minimal memory needed

### CPU Requirements

- **No GPU required** — all computation is CPU-based
- **No special CPU features required** — works on any modern CPU
- **Performance**: Training and inference are fast even on low-end hardware

---

## Optional Dependencies

Some features may use optional dependencies:

- **@xenova/transformers**: For advanced text encoding (optional)
- **ml-matrix**: For matrix operations (bundled, no installation needed)
- **csv-parse**: For CSV file parsing (optional, for examples)

These are automatically installed when you run `npm install`.

---

## Platform-Specific Notes

### Windows

- Use PowerShell or Command Prompt
- Long path support may need to be enabled
- Some npm operations may require Administrator privileges

### Linux

- Works on all major distributions
- May need build tools for native dependencies
- File permissions may need adjustment

### macOS

- Works on Intel and Apple Silicon
- Xcode Command Line Tools required
- Gatekeeper may need configuration for global npm packages

---

## Troubleshooting

### Common Issues

**"Node version too old"**
- Solution: Upgrade to Node.js 18.0.0 or higher

**"Permission denied" errors**
- Windows: Run terminal as Administrator
- Linux/macOS: Check file permissions, use `sudo` if necessary (for global installs only)

**"Module not found" errors**
- Solution: Run `npm install` to install dependencies

**Build failures**
- Ensure all build tools are installed (see platform-specific sections)
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

**Browser compatibility issues**
- Ensure you're using a supported browser version
- Check browser console for specific error messages

### Getting Help

- **GitHub Issues**: [https://github.com/infiniteCrank/AsterMind-ELM/issues](https://github.com/infiniteCrank/AsterMind-ELM/issues)
- **Documentation**: See README.md in the repository
- **Examples**: Check the `examples/` directory for working code

---

## Summary

AsterMind ELM has minimal requirements and works on:
- ✅ **Windows 10/11** with Node.js 18+
- ✅ **Linux** (all major distributions) with Node.js 18+
- ✅ **macOS 11+** with Node.js 18+
- ✅ **Modern browsers** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

**No GPU, no special hardware, no external services required.**

The library is designed to be lightweight, fast, and accessible on any modern computing platform.

---

*Last updated: 2025-01-16*

