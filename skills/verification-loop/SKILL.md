---
name: Verification Loop
description: Continuous verification and quality assurance
---

# Verification Loop Skill

Implement continuous verification throughout development.

## Verification Cycle

```
┌───────────────────────────────────────────┐
│                                           │
│   IMPLEMENT ──► VERIFY ──► ITERATE       │
│       ▲                       │           │
│       └───────────────────────┘           │
│                                           │
└───────────────────────────────────────────┘
```

## Verification Steps

### 1. Code Quality
```bash
npm run lint           # ESLint check
npm run typecheck      # TypeScript (if applicable)
```

### 2. Unit Tests
```bash
npm run test           # Run test suite
npm run test:coverage  # Check coverage
```

### 3. Build Verification
```bash
npm run build          # Ensure it builds
```

### 4. Visual Verification
- Check component renders correctly
- Verify responsive design
- Test user interactions

## Checkpoint System

Use `/checkpoint` to save verification state:

```markdown
## Checkpoint: Feature Implementation

**Timestamp**: 2026-01-24T08:52:00Z
**Status**: ✅ All checks passed

### Verification Results
- [x] Lint: 0 errors
- [x] Tests: 15 passed, 0 failed
- [x] Build: Success
- [x] Coverage: 82%

### Files Changed
- src/components/NewFeature.jsx
- src/components/NewFeature.test.jsx

### Next Steps
- Add E2E tests
- Update documentation
```

## Integration with Eval Harness

The verification loop uses the eval-harness skill to:
1. Run automated evaluations
2. Track quality metrics
3. Generate reports

## Commands

```bash
/verify              # Run full verification
/checkpoint          # Save current state
/verify quick        # Quick lint + test
/verify full         # Full verification suite
```
