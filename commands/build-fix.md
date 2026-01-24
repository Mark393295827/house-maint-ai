---
description: Fix build errors automatically
---

# Build Fix Command

Use `/build-fix` to diagnose and fix build errors.

// turbo-all

## Usage

```
/build-fix           # Analyze and fix build errors
/build-fix --dry     # Show fixes without applying
/build-fix --verbose # Detailed diagnostics
```

## Process

1. **Run build** to capture errors
2. **Parse** error messages
3. **Diagnose** root causes
4. **Apply** fixes
5. **Verify** build succeeds

## Common Fixes

| Error Type | Auto-Fix |
|------------|----------|
| Missing import | Add import statement |
| Type mismatch | Suggest correct type |
| Module not found | Install package |
| Syntax error | Fix syntax |
| Unused variable | Remove or use |

## Commands

### Check Build
```bash
npm run build
```

### Common Fixes
```bash
# Clear cache and rebuild
rm -rf node_modules/.cache
npm run build

# Reinstall dependencies
rm -rf node_modules
npm install
npm run build

# Update lockfile
npm install --package-lock-only
```

## Example Session

```
> /build-fix

Analyzing build errors...

Error 1: Cannot find module './utils'
  File: src/components/Header.jsx:3
  Fix: Update import path to './utils/index'

Error 2: 'useState' is not defined
  File: src/pages/Dashboard.jsx:5
  Fix: Add import { useState } from 'react'

Applying fixes...
✓ Fixed 2 errors

Running build verification...
✓ Build successful!
```

## Delegates To

`build-error-resolver` agent for complex diagnostics.
