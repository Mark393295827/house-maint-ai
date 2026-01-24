---
name: Coding Standards
description: Language best practices and coding conventions
---

# Coding Standards Skill

Comprehensive coding standards for the house-maint-ai project.

## JavaScript/TypeScript Standards

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Functions | camelCase | `getUserData` |
| Components | PascalCase | `UserProfile` |
| Files (components) | PascalCase | `UserProfile.jsx` |
| Files (utilities) | camelCase | `formatDate.js` |

### Code Style

```javascript
// ✅ Good
const getUserById = async (id) => {
  const user = await fetchUser(id);
  return user;
};

// ❌ Bad
async function getUserById(id) {
  var user = await fetchUser(id)
  return user
}
```

### Immutability

```javascript
// ✅ Prefer immutable operations
const newItems = [...items, newItem];
const updated = { ...obj, field: newValue };

// ❌ Avoid mutations
items.push(newItem);
obj.field = newValue;
```

## React Standards

### Component Structure

```jsx
// 1. Imports (external, then internal)
import { useState, useEffect } from 'react';
import { formatDate } from '../utils/formatDate';

// 2. Component definition
export default function ComponentName({ prop1, prop2 }) {
  // 3. Hooks
  const [state, setState] = useState(null);
  
  // 4. Effects
  useEffect(() => {
    // effect logic
  }, [dependency]);
  
  // 5. Event handlers
  const handleClick = () => {};
  
  // 6. Render
  return (
    <div>
      {/* content */}
    </div>
  );
}
```

### Hook Rules

1. Only call hooks at the top level
2. Only call hooks from React functions
3. Name custom hooks with `use` prefix
4. Keep dependency arrays accurate

## File Organization

```
src/
├── components/       # Reusable UI components
├── pages/            # Route-level components
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── constants/        # Static data
├── services/         # API services
└── test/             # Test utilities
```

## ESLint Configuration

Run lint: `npm run lint`
Auto-fix: `npm run lint -- --fix`
