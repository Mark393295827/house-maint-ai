---
description: Quick-start guide for the Automatic Iteration Framework
---

# Automatic Iteration Quick Start

## TL;DR

```bash
/iterate          # Full SDA cycle
/iterate simulate # Test only
```

## When to Use

| Task Type | Command |
|-----------|---------|
| Bug fix (1-2 files) | Direct fix |
| New feature | `/iterate` |
| Architecture change | `/iterate` |

## Framework Flow

```
Request → Task Router → [Simple: Direct] or [Complex: Full Framework]
```

## Agents

| Agent | Purpose |
|-------|---------|
| `task-router` | Auto-select mode |
| `manager-agent` | Decompose tasks |
| `tree-of-thoughts` | Explore paths |
| `constraint-auditor` | Remove redundancy |

## Example: Adding a Feature

1. Describe feature
2. Task Router scores complexity
3. If complex: Full framework runs automatically
4. SDA loop iterates until done

## Commands

| Command | Description |
|---------|-------------|
| `/iterate` | Run full cycle |
| `/build` | Build only |
| `/test` | Test only |
| `/dev-server` | Start dev |
