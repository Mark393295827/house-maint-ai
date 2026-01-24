# User CLAUDE.md Example

This file demonstrates how to configure user-level CLAUDE settings.
Place at `~/.claude/CLAUDE.md` for global settings.

## User Preferences

```yaml
preferences:
  # Coding style preferences
  style:
    semicolons: true
    quotes: single
    indent: 2
    trailing_commas: es5

  # Editor preferences
  editor:
    format_on_save: true
    auto_fix_lint: true
    
  # Agent preferences
  agents:
    default: planner
    auto_delegate: true
    require_confirmation: false
```

## Global Rules

```yaml
global_rules:
  # Always apply these rules
  - Never commit secrets or API keys
  - Always run tests before suggesting commit
  - Use semantic commit messages
  
  # Coding standards
  - Prefer functional programming
  - Use immutable data structures
  - Write self-documenting code
```

## MCP Servers

```yaml
mcp_servers:
  github:
    enabled: true
    token: ${GITHUB_TOKEN}
    
  filesystem:
    enabled: true
    allowed_paths:
      - ~/projects
      - ~/work
```

## Shortcuts

```yaml
shortcuts:
  # Quick commands
  t: /tdd
  p: /plan
  v: /verify
  r: /code-review
  b: /build-fix
```

## Context Memories

```yaml
memories:
  # Things to always remember
  - I prefer detailed explanations
  - I use VS Code as my editor
  - My projects are in ~/projects
```
