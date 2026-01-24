# Project CLAUDE.md Example

This file demonstrates how to configure a project-level CLAUDE configuration.

## Project Configuration

```yaml
project:
  name: house-maint-ai
  type: react-webapp
  framework: vite

defaults:
  agent: planner
  context: dev
  verification: true

skills:
  - coding-standards
  - frontend-patterns
  - tdd-workflow
  - security-review

rules:
  always:
    - security
    - coding-style
    - testing
    - git-workflow

commands:
  enabled:
    - /tdd
    - /plan
    - /verify
    - /code-review
    - /build-fix
```

## Memory Settings

```yaml
memory:
  persistence: true
  strategy: longform-sync
  checkpoints: auto
  
compaction:
  threshold: 85%
  auto: false
  priority:
    - current_task
    - recent_changes
    - decisions
```

## Verification Loop

```yaml
verification:
  enabled: true
  on_commit: true
  checks:
    - lint
    - test
    - build
  coverage_target: 80%
```

## Custom Rules

Add project-specific rules here that override or extend the default rules.

```yaml
custom_rules:
  - All components must have data-testid attributes
  - Use Tailwind for all styling
  - No inline styles
```
