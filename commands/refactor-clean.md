---
description: Clean up dead code and refactor
---

# Refactor Clean Command

Use `/refactor-clean [target]` to remove dead code and refactor.

## Usage

```
/refactor-clean                  # Analyze whole project
/refactor-clean src/components/  # Specific directory
/refactor-clean --unused         # Focus on unused code
/refactor-clean --complexity     # Focus on complex code
/refactor-clean --apply          # Apply suggested changes
```

## Analysis Types

### Unused Code Detection
- Unused imports
- Unused variables
- Unused functions
- Unused components
- Dead code branches

### Complexity Analysis
- Long functions (>50 lines)
- Deep nesting (>3 levels)
- Too many parameters (>4)
- Large files (>300 lines)

### Duplication Detection
- Repeated code blocks
- Similar functions
- Copy-paste patterns

## Output Format

```markdown
# Refactoring Report

## Unused Code
| File | Item | Type |
|------|------|------|
| Header.jsx | oldHandler | function |
| utils.js | deprecatedFn | export |

## Complexity Issues
| File | Issue | Suggestion |
|------|-------|------------|
| Dashboard.jsx | Function too long (85 lines) | Extract into smaller functions |

## Duplication
| Files | Lines | Suggestion |
|-------|-------|------------|
| A.jsx, B.jsx | 15-30 | Extract shared component |

## Recommended Actions
1. Remove 3 unused imports
2. Extract 2 functions
3. Create shared utility
```

## Commands

```bash
# Find unused dependencies
npx depcheck

# ESLint auto-fix
npm run lint -- --fix
```

## Safety

Always run tests before and after refactoring:
```bash
npm run test
# Apply refactoring
npm run test
```
