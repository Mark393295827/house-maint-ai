---
description: Extract patterns from current session
---

# Learn Command

Use `/learn` to extract and persist patterns from the current session.

## Usage

```
/learn                # Extract patterns from session
/learn review         # Show learned patterns
/learn export         # Export patterns to file
/learn forget <id>    # Remove a pattern
```

## What Gets Learned

### Solution Patterns
- Bug fixes that worked
- Performance optimizations
- Code patterns that solved problems

### Project Conventions
- File structure patterns
- Naming conventions
- Component patterns

### User Preferences
- Coding style choices
- Tool preferences
- Review feedback

## Pattern Format

```json
{
  "id": "pat-001",
  "type": "solution",
  "context": "React performance",
  "problem": "Component re-rendering too often",
  "solution": "Use useMemo for expensive calculations",
  "example": "const sorted = useMemo(() => data.sort(), [data])",
  "tags": ["react", "performance", "hooks"],
  "frequency": 3,
  "confidence": 0.9
}
```

## Example Session

```
> /learn

Analyzing session for patterns...

Extracted Patterns:

1. [solution] React Performance
   Problem: Expensive calculation in render
   Solution: Use useMemo hook
   Confidence: High

2. [convention] Component Structure
   Pattern: Export default at end of file
   Frequency: 5 times this session

3. [preference] Error Handling
   Pattern: Use try-catch with specific errors
   Source: User feedback

Saved 3 patterns to memory.
```

## Storage

Patterns stored in:
`hooks/memory-persistence/patterns.json`

## Integration

Part of the Longform Guide memory persistence system.
