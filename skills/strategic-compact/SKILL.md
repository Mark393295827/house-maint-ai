---
name: Strategic Compact
description: Manual compaction suggestions for context management
---

# Strategic Compact Skill

Optimize context window usage through strategic compaction.

## Purpose

When context is filling up:
- Suggest what to compact/summarize
- Prioritize retention of critical info
- Maintain coherent conversation flow

## Compaction Triggers

| Condition | Action |
|-----------|--------|
| Context > 70% | Suggest optional compaction |
| Context > 85% | Recommend compaction |
| Context > 95% | Force compaction |

## What to Keep

### High Priority (Never Compact)
- Current task details
- Active file changes
- User requirements
- Critical decisions made

### Medium Priority (Summarize)
- Previous subtasks
- Resolved issues
- Earlier exploration

### Low Priority (Can Remove)
- Verbose tool outputs
- Failed attempts (keep summary)
- Redundant information

## Compaction Suggestions Format

```markdown
## Context Compaction Suggestion

**Current Usage**: 85% (34K / 40K tokens)

### Suggested Compactions

1. **Tool Outputs** (saves ~5K tokens)
   - Verbose directory listings
   - Full file contents already processed

2. **Resolved Tasks** (saves ~3K tokens)
   - Component creation (keep: created Header.jsx)
   - Bug fix attempts (keep: solution in lines 45-50)

### Recommended Summary
[Condensed version of compactable content]
```

## Integration

Used by:
- `/checkpoint` command
- Session end hooks
- Manual `/compact` requests
