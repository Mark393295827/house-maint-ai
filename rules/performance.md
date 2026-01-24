# Performance Rules

Model selection and context management guidelines.

## Context Management

### Token Budget

Be mindful of context window usage:

| Priority | Content | Action |
|----------|---------|--------|
| High | Current task | Keep full |
| Medium | Recent changes | Summarize |
| Low | Old exploration | Compact |

### When to Compact

- Context > 70%: Consider compacting
- Context > 85%: Recommend compacting
- Context > 95%: Force compact

### What to Keep

1. Current task requirements
2. Active file changes
3. Critical decisions
4. User preferences

### What to Summarize

1. Completed subtasks
2. Resolved issues
3. Exploration paths

## Code Performance

### React Optimization

```jsx
// ✅ Memoize expensive calculations
const sortedItems = useMemo(() => 
  items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// ✅ Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// ✅ Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Bundle Size

Monitor bundle size:
```bash
npm run build
# Check dist folder size
```

Target: < 500KB initial bundle

### Performance Checklist

- [ ] No unnecessary re-renders
- [ ] Images optimized
- [ ] Code split where appropriate
- [ ] Lazy loading implemented
- [ ] Memoization used correctly

## Agent Performance

### Efficient Tool Usage

1. Batch related operations
2. Use specific file ranges
3. Minimize redundant reads
4. Cache frequently used info
