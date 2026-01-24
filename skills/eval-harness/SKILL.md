---
name: Eval Harness
description: Verification and evaluation harness for testing
---

# Eval Harness Skill

Comprehensive evaluation harness for verifying code changes.

## Purpose

- Run automated tests
- Evaluate code quality
- Generate verification reports
- Track quality metrics over time

## Evaluation Pipeline

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  LINT ──► TESTS ──► BUILD ──► COVERAGE ──► REPORT │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Commands

### Full Evaluation
```bash
npm run lint && npm run test && npm run build
```

### Quick Check
```bash
npm run lint && npm run test
```

### Coverage Report
```bash
npm run test:coverage
```

## Evaluation Criteria

| Metric | Target | Critical |
|--------|--------|----------|
| Lint Errors | 0 | Yes |
| Test Pass Rate | 100% | Yes |
| Coverage | 80% | No |
| Build Success | Yes | Yes |

## Report Format

```json
{
  "timestamp": "2026-01-24T08:52:00Z",
  "duration": "45s",
  "results": {
    "lint": { "status": "pass", "errors": 0, "warnings": 2 },
    "tests": { "status": "pass", "passed": 15, "failed": 0 },
    "build": { "status": "pass", "size": "234KB" },
    "coverage": { "statements": 82, "branches": 78, "functions": 85 }
  },
  "verdict": "PASS"
}
```

## Integration

Used by:
- `/verify` command
- `/checkpoint` command
- CI/CD pipelines
- Pre-commit hooks

## Custom Evaluations

Add project-specific evaluations in `eval-harness/custom/`:

```javascript
// custom/accessibility.js
export async function evaluate() {
  // Run accessibility checks
  return { status: 'pass', issues: [] };
}
```
