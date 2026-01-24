# Git Workflow Rules

Commit format and PR process guidelines.

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Maintenance |

### Examples

```
feat(auth): add login component

fix(header): resolve mobile menu toggle issue

docs(readme): update installation instructions

refactor(utils): extract date formatting functions

test(header): add unit tests for Header component
```

## Branch Naming

```
feature/description-here
bugfix/issue-number-description
hotfix/critical-fix
docs/documentation-update
```

## Pull Request Process

### Before Opening PR

1. [ ] Tests pass: `npm run test`
2. [ ] Lint clean: `npm run lint`
3. [ ] Build works: `npm run build`
4. [ ] Self-review completed
5. [ ] Documentation updated

### PR Title Format

```
[TYPE] Brief description

Examples:
[FEAT] Add user authentication flow
[FIX] Resolve header navigation issue
[DOCS] Update API documentation
```

### PR Description Template

```markdown
## Summary
Brief description of changes.

## Changes
- Change 1
- Change 2

## Testing
How was this tested?

## Screenshots
(if applicable)

## Checklist
- [ ] Tests added
- [ ] Documentation updated
- [ ] Self-review completed
```

## Merge Strategy

Use **Squash and Merge** for clean history.
