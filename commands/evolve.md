---
name: evolve
description: Cluster related instincts into new skills, commands, or agents
command: true
---

# Evolve Command

## Implementation

Run the instinct CLI using the plugin root path:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/continuous-learning-v2/scripts/instinct-cli.py" evolve
```

Or if `CLAUDE_PLUGIN_ROOT` is not set (manual installation), use:

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py evolve
```

## Usage

```
/evolve
/evolve --dry-run
```

## What to Do

1. Analyze all instincts in `~/.claude/homunculus/instincts/`
2. Cluster them by semantic similarity (embeddings or topic tags)
3. Identify clusters with > 3 related instincts
4. Generate a new artifact (Skill, Command, or Agent)
5. Save to `~/.claude/homunculus/evolved/`
