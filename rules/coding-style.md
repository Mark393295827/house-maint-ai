# Coding Style Rules

Consistent coding style guidelines for the project.

## Immutability

**Always prefer immutable operations.**

```javascript
// ✅ Good - Immutable
const newItems = [...items, newItem];
const updated = { ...obj, field: newValue };
const filtered = items.filter(x => x.active);

// ❌ Bad - Mutating
items.push(newItem);
obj.field = newValue;
items.splice(0, 1);
```

## File Organization

### Component Files

```
ComponentName/
├── ComponentName.jsx     # Main component
├── ComponentName.test.jsx # Tests
├── ComponentName.css     # Styles (if needed)
└── index.js              # Barrel export
```

### Imports Order

```javascript
// 1. React and core libraries
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// 2. Third-party libraries
import { format } from 'date-fns';

// 3. Internal components
import { Header } from '../components/Header';

// 4. Utilities and constants
import { formatCurrency } from '../utils/format';
import { API_URL } from '../constants';

// 5. Styles
import './styles.css';
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile` |
| Functions | camelCase | `getUserData` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Files (components) | PascalCase | `UserProfile.jsx` |
| Files (utilities) | camelCase | `formatDate.js` |

## Function Style

```javascript
// ✅ Prefer arrow functions for components
const Button = ({ onClick, children }) => (
  <button onClick={onClick}>{children}</button>
);

// ✅ Use named exports
export function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

// ✅ Default export at end of file
export default ComponentName;
```

## Error Handling

```javascript
// ✅ Always handle errors
try {
  const data = await fetchData();
  return data;
} catch (error) {
  console.error('Failed to fetch:', error);
  throw new Error('Data fetch failed');
}
```
