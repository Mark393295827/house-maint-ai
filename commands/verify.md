---
description: Run the verification loop
---

# Verify Command

Use `/verify` to run the complete verification loop.

// turbo-all

## Usage

```
/verify              # Full verification
/verify quick        # Lint + tests only
/verify build        # Include build check
/verify full         # All checks + coverage
```

## Verification Steps

### Quick (/verify quick)
1. ESLint check
2. Run tests

### Standard (/verify)
1. ESLint check
2. Run tests
3. Check coverage

### Full (/verify full)
1. ESLint check
2. Run tests
3. Check coverage
4. Build verification
5. Bundle size check

## Commands

```bash
# Quick
npm run lint && npm run test

# Standard
npm run lint && npm run test:coverage

# Full
npm run lint && npm run test:coverage && npm run build
```

## Output Format

```markdown
# Verification Report

**Timestamp**: 2026-01-24T08:52:00Z
**Duration**: 45 seconds

## Results

| Check | Status | Details |
|-------|--------|---------|
| Lint | ✅ Pass | 0 errors, 2 warnings |
| Tests | ✅ Pass | 15 passed, 0 failed |
| Coverage | ✅ Pass | 82% (target: 80%) |
| Build | ✅ Pass | 234KB |

## Summary

All checks passed! ✅

## Next Steps
- Review lint warnings
- Consider adding edge case tests
```

## Integration

- Works with `/checkpoint` to save state
- Uses eval-harness for evaluation
- Reports to verification-loop skill
