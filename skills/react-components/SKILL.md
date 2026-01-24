---
name: React Components
description: Patterns and utilities for building React components in house-maint-ai
---

# React Components Skill

This skill provides patterns, templates, and best practices for creating React components in the house-maint-ai project.

## Component Structure

All components should follow this structure:

```
src/components/
├── ComponentName.jsx        # Component implementation
├── ComponentName.test.jsx   # Component tests
└── index.js                 # Optional barrel export
```

## Component Template

```jsx
import { useState } from 'react';

/**
 * ComponentName - Brief description
 * 
 * @param {Object} props
 * @param {string} props.title - The title to display
 * @param {function} props.onClick - Click handler
 */
export default function ComponentName({ title, onClick }) {
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    setIsActive(true);
    onClick?.();
  };

  return (
    <div className="p-4 rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">
        {title}
      </h2>
      <button
        onClick={handleClick}
        className={`mt-2 px-4 py-2 rounded-md transition-colors ${
          isActive 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Click me
      </button>
    </div>
  );
}
```

## Styling Guidelines

### Tailwind CSS Classes

Use these utility patterns:

| Purpose | Classes |
|---------|---------|
| Card container | `p-4 rounded-lg bg-white shadow-sm` |
| Primary button | `px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700` |
| Secondary button | `px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200` |
| Heading | `text-lg font-semibold text-gray-800` |
| Body text | `text-sm text-gray-600` |

### Responsive Design

Always design mobile-first:

```jsx
<div className="px-4 md:px-6 lg:px-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Content */}
  </div>
</div>
```

## Existing Components Reference

- `Header` - Top navigation header
- `BottomNav` - Bottom navigation bar
- `SearchBar` - Search input component
- `QuickActions` - Quick action buttons grid
- `ActivityCard` - Activity display card
- `SuggestionList` - List of suggestions
- `LoadingSpinner` - Loading indicator

## Testing Pattern

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ComponentName from './ComponentName';

describe('ComponentName', () => {
  it('renders with title', () => {
    render(<ComponentName title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('calls onClick when button clicked', () => {
    const handleClick = vi.fn();
    render(<ComponentName title="Test" onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```
