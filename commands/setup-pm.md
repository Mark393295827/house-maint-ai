---
description: Configure package manager for the project
---

# Setup PM Command

Use `/setup-pm` to configure the package manager.

// turbo-all

## Usage

```
/setup-pm           # Auto-detect and setup
/setup-pm npm       # Use npm
/setup-pm yarn      # Use yarn
/setup-pm pnpm      # Use pnpm
```

## What It Does

1. **Detect** existing lockfiles
2. **Verify** package manager installed
3. **Install** dependencies if needed
4. **Configure** project settings

## Detection Logic

| Lockfile | Package Manager |
|----------|-----------------|
| package-lock.json | npm |
| yarn.lock | yarn |
| pnpm-lock.yaml | pnpm |

## Script

Run directly:
```bash
node scripts/setup-package-manager.js
```

## Example Session

```
> /setup-pm

🔧 Setting up package manager...

📦 Detected package manager: npm
✅ npm version 10.9.2 is installed
✅ Dependencies already installed

🎉 Package manager setup complete!
```

## Troubleshooting

### Dependencies Not Installing
```bash
rm -rf node_modules
npm install
```

### Lockfile Conflicts
```bash
rm package-lock.json
npm install
```

### Permission Errors
```bash
# Windows
Run as Administrator

# macOS/Linux
sudo npm install
```
