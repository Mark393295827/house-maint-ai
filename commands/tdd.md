---
description: Test-driven development workflow
---

# TDD Command

Use `/tdd [feature]` to start a test-driven development session.

// turbo-all

## Usage

```
/tdd <feature-name>
/tdd component Header
/tdd function formatCurrency
/tdd fix bug-123
```

## Workflow

### 1. Understand the Feature
```
What should [feature] do?
What are the inputs and outputs?
What are the edge cases?
```

### 2. Write Failing Test
```bash
# Create test file
touch src/components/Feature.test.jsx
```

```jsx
describe('Feature', () => {
  it('should do the expected thing', () => {
    expect(feature()).toBe(expected);
  });
});
```

### 3. Run Test (Should Fail)
```bash
npm run test -- Feature.test.jsx
```

### 4. Implement Minimum Code
Write just enough code to make the test pass.

### 5. Run Test (Should Pass)
```bash
npm run test -- Feature.test.jsx
```

### 6. Refactor
Improve the code while keeping tests green.

### 7. Repeat
Add more tests for edge cases.

## Example Session

```
> /tdd formatDate utility

Starting TDD session for: formatDate utility

Step 1: Writing test...
✓ Created src/utils/formatDate.test.js

Step 2: Test created, running (expecting failure)...
✗ Test failed as expected

Step 3: Implementing formatDate...
✓ Created src/utils/formatDate.js

Step 4: Running tests...
✓ All tests passing

Step 5: Refactoring...
✓ Code improved, tests still passing

TDD session complete!
```
