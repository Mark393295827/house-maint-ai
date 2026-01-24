---
name: TDD Workflow
description: Test-driven development methodology
---

# TDD Workflow Skill

Complete test-driven development workflow for the project.

## The TDD Cycle

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   RED ──────────► GREEN ──────────► REFACTOR       │
│    │                                    │          │
│    │ Write failing test                 │          │
│    │ Make it pass (minimal)             │          │
│    │ Improve code quality               │          │
│    │                                    │          │
│    └────────────────────────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Step-by-Step Process

### 1. RED - Write Failing Test

```jsx
// Write test first
describe('formatCurrency', () => {
  it('should format number as USD', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});
```

Run test - it should FAIL (function doesn't exist yet).

### 2. GREEN - Make It Pass

```javascript
// Minimal implementation
function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
```

Run test - it should PASS.

### 3. REFACTOR - Improve Code

```javascript
// Refactored with options
function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}
```

Run test - still PASSES.

## Test Types

| Type | Purpose | Location |
|------|---------|----------|
| Unit | Individual functions | `*.test.js` |
| Integration | Component interactions | `*.test.jsx` |
| E2E | User flows | `e2e/*.spec.js` |

## Coverage Requirements

```
Statements: 80%
Branches:   75%
Functions:  80%
Lines:      80%
```

## Commands

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test -- MyComponent.test.jsx  # Single file
```
