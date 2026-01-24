---
description: Run the test suite
---

# Run Tests

// turbo-all

1. Run the full test suite:
```bash
npm run test
```

2. For interactive UI mode:
```bash
npm run test:ui
```

3. To generate coverage report:
```bash
npm run test:coverage
```

## Running Specific Tests

Run tests for a specific component:
```bash
npm run test -- src/components/Header.test.jsx
```

Run tests matching a pattern:
```bash
npm run test -- --grep "Header"
```

## Expected Output

```
 ✓ src/components/Header.test.jsx (3 tests)
 ✓ src/components/BottomNav.test.jsx (2 tests)
 ✓ src/components/LoadingSpinner.test.jsx (2 tests)

 Test Files  3 passed (3)
      Tests  7 passed (7)
   Start at  08:38:00
   Duration  XXXms
```
