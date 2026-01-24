---
name: Continuous Learning
description: Auto-extract patterns from development sessions
---

# Continuous Learning Skill

Automatically extract and persist development patterns from sessions.

## Purpose

This skill enables the agent to:
- Learn from successful patterns during development
- Build a knowledge base of project-specific solutions
- Improve future recommendations

## Pattern Extraction

### What to Capture

1. **Successful Solutions**
   - Bug fixes that worked
   - Performance optimizations
   - Code patterns that solved problems

2. **Project Conventions**
   - File naming patterns
   - Component structure
   - State management approaches

3. **User Preferences**
   - Coding style choices
   - Tool preferences
   - Review feedback

## Storage Format

```json
{
  "patterns": [
    {
      "id": "pattern-001",
      "type": "solution",
      "context": "React component re-rendering",
      "pattern": "Use useMemo for expensive calculations",
      "example": "const sorted = useMemo(() => items.sort(), [items])",
      "frequency": 5,
      "lastUsed": "2026-01-24T08:00:00Z"
    }
  ]
}
```

## Integration with /learn Command

When `/learn` is invoked:
1. Analyze recent session activity
2. Identify patterns worth capturing
3. Store in `hooks/memory-persistence/patterns.json`
4. Provide summary to user

## Usage

```bash
/learn                    # Extract patterns from current session
/learn review             # Show learned patterns
/learn forget [pattern]   # Remove a pattern
```

## Longform Guide Integration

This skill is part of the Longform Guide system for persistent memory across sessions.
