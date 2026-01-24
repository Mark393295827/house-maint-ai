# Testing Rules

Test-driven development and coverage requirements.

## TDD Requirement

**Write tests BEFORE implementation** for all new features.

```
1. RED    - Write failing test
2. GREEN  - Make it pass (minimal code)
3. REFACTOR - Improve code quality
```

## Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 80% | 90% |
| Branches | 75% | 85% |
| Functions | 80% | 90% |
| Lines | 80% | 90% |

Check coverage:
```bash
npm run test:coverage
```

## Test File Location

Tests should be co-located with source files:

```
src/components/
├── Header.jsx
├── Header.test.jsx    # ✅ Co-located
```

## Test Naming

```javascript
describe('ComponentName', () => {
  it('should render correctly with default props', () => {});
  it('should handle click events', () => {});
  it('should display error state when fetch fails', () => {});
});
```

## Required Tests

### Every Component Must Have

- [ ] Render test (default state)
- [ ] Props validation test
- [ ] User interaction tests
- [ ] Error state tests (if applicable)

### Every Utility Function Must Have

- [ ] Happy path test
- [ ] Edge case tests
- [ ] Error handling tests

## Test Template

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Component from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Component onClick={onClick} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```
