---
description: Request a code review
---

# Code Review Command

Use `/code-review [target]` to request a code review.

## Usage

```
/code-review                     # Review recent changes
/code-review src/components/     # Review directory
/code-review Header.jsx          # Review specific file
/code-review --security          # Focus on security
/code-review --performance       # Focus on performance
```

## Review Process

1. **Collect** files to review
2. **Analyze** code quality
3. **Check** against standards
4. **Generate** review report

## Review Checklist

### Code Quality
- [ ] Clean, readable code
- [ ] Proper naming conventions
- [ ] No code duplication
- [ ] Error handling

### React Specifics
- [ ] Proper hook usage
- [ ] Correct dependencies
- [ ] Key props for lists
- [ ] Performance considerations

### Security
- [ ] No exposed secrets
- [ ] Input validation
- [ ] XSS prevention

### Testing
- [ ] Tests exist
- [ ] Tests are meaningful
- [ ] Edge cases covered

## Output Format

```markdown
# Code Review: [File/Directory]

## Summary
Brief overview of the code reviewed.

## ✅ Approved
- Good patterns observed

## ⚠️ Suggestions
- Optional improvements

## ❌ Issues
- Must fix before merge

---

**Verdict**: APPROVED / NEEDS CHANGES
```

## Example

```
> /code-review src/components/Header.jsx

Reviewing Header.jsx...

# Code Review: Header.jsx

## Summary
Header component with navigation and user menu.

## ✅ Approved
- Clean component structure
- Proper accessibility attributes

## ⚠️ Suggestions
- Consider memoizing menu items

## ❌ Issues
- Missing prop types

**Verdict**: NEEDS CHANGES (minor)
```
