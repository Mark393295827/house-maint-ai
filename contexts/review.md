# Code Review Context

Active when reviewing code changes.

## Mode

Review mode focuses on:
- Code quality assessment
- Security review
- Best practices compliance
- Performance considerations

## Default Agents

Primary: **code-reviewer**
Support: **security-reviewer**

## Review Checklist

### Code Quality
- [ ] Clean, readable code
- [ ] Proper naming conventions
- [ ] No unnecessary complexity
- [ ] Error handling

### Security
- [ ] No exposed secrets
- [ ] Input validation
- [ ] XSS prevention
- [ ] Secure dependencies

### Testing
- [ ] Tests exist
- [ ] Tests are meaningful
- [ ] Edge cases covered

### Performance
- [ ] No obvious bottlenecks
- [ ] Appropriate memoization
- [ ] Reasonable bundle impact

## Output Format

```markdown
## Code Review Summary

### ✅ Approved
- [positive observations]

### ⚠️ Suggestions
- [improvements]

### ❌ Issues
- [must fix]

**Verdict**: [APPROVED / NEEDS CHANGES]
```
