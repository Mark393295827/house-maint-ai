# Agent Delegation Rules

Guidelines for when to delegate tasks to specialized agents.

## Available Agents

| Agent | Purpose | Trigger |
|-------|---------|---------|
| `planner` | Task planning and orchestration | Default, /plan |
| `architect` | System design decisions | Architecture questions |
| `tdd-guide` | Test-driven development | /tdd, testing tasks |
| `code-reviewer` | Quality review | /code-review |
| `security-reviewer` | Vulnerability analysis | Security concerns |
| `build-error-resolver` | Fix build errors | /build-fix |
| `e2e-runner` | End-to-end testing | /e2e |
| `refactor-cleaner` | Dead code cleanup | /refactor-clean |
| `doc-updater` | Documentation sync | Doc updates |

## Delegation Rules

### Automatic Delegation

```yaml
routing:
  - pattern: "implement|create|build|add|modify|fix|code"
    delegate_to: coder
    
  - pattern: "review|check|validate|audit"
    delegate_to: code-reviewer
    
  - pattern: "test|tdd|spec"
    delegate_to: tdd-guide
    
  - pattern: "security|vulnerability|audit"
    delegate_to: security-reviewer
    
  - pattern: "build error|compile error|won't build"
    delegate_to: build-error-resolver
    
  - pattern: "e2e|playwright|browser test"
    delegate_to: e2e-runner
    
  - pattern: "refactor|cleanup|dead code|unused"
    delegate_to: refactor-cleaner
    
  - pattern: "document|readme|jsdoc"
    delegate_to: doc-updater
    
  - pattern: "design|architect|structure"
    delegate_to: architect
    
  - pattern: "plan|how to|approach"
    delegate_to: planner
    
  - default: planner
```

## Handoff Protocol

When delegating:

1. **Complete current subtask**
2. **Document context** for target agent
3. **Specify expected output**
4. **Include relevant files**

```yaml
handoff:
  to: [agent-name]
  task: [task description]
  context:
    files: [relevant files]
    requirements: [specific requirements]
  return: [expected output format]
```

## Multi-Agent Collaboration

For complex tasks:
1. Planner breaks down work
2. Delegates to specialists
3. Synthesizes results
4. Runs verification
