---
description: Save verification checkpoint and preserve state
---

# Checkpoint Command

Use `/checkpoint [message]` to save current progress and verification state.

## Usage

```
/checkpoint                      # Save with auto-generated message
/checkpoint "Feature complete"   # Save with custom message
/checkpoint --verify             # Run verification before saving
```

## What It Saves

1. **Verification State**
   - Lint results
   - Test results
   - Coverage metrics
   - Build status

2. **File Changes**
   - Modified files list
   - Line changes summary

3. **Session Context**
   - Current task
   - Decisions made
   - Patterns learned

## Checkpoint Format

```markdown
## Checkpoint: [Message]

**Timestamp**: 2026-01-24T08:52:00Z
**Session ID**: abc123

### Verification Status
| Check | Status |
|-------|--------|
| Lint | ✅ 0 errors |
| Tests | ✅ 15 passed |
| Coverage | ✅ 82% |
| Build | ✅ Success |

### Files Changed
- `src/components/Header.jsx` (+25, -10)
- `src/components/Header.test.jsx` (+40, -0)

### Context Summary
- Implemented responsive header
- Added mobile menu toggle
- Used React state for menu visibility

### Next Steps
- Add E2E tests
- Update documentation
```

## Storage

Checkpoints saved to:
`hooks/memory-persistence/checkpoints/`

## Integration

- Uses eval-harness for verification
- Triggers memory persistence hooks
- Part of Longform Guide system
