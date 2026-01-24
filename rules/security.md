# Security Rules

Mandatory security checks for all code changes.

## Required Checks

### Before Every Commit

- [ ] No hardcoded secrets, API keys, or passwords
- [ ] No sensitive data in logs
- [ ] All user inputs validated
- [ ] All outputs properly encoded

### React-Specific

```jsx
// ❌ NEVER DO THIS
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ❌ NEVER DO THIS  
eval(userCode);

// ❌ NEVER DO THIS
new Function(userInput);

// ✅ SAFE
<div>{sanitizedContent}</div>
```

### Environment Variables

```javascript
// ✅ Use environment variables for secrets
const apiKey = import.meta.env.VITE_API_KEY;

// ❌ Never hardcode
const apiKey = 'sk-1234567890abcdef';
```

### Dependency Security

Run before every PR:
```bash
npm audit
```

Fix vulnerabilities:
```bash
npm audit fix
```

## OWASP Compliance

Ensure protection against:
1. **Injection** - Parameterize all queries
2. **Broken Auth** - Secure session management
3. **XSS** - Output encoding
4. **Sensitive Data** - Encryption at rest/transit
5. **Access Control** - Authorization checks

## Reporting

Security issues should be:
1. Flagged immediately
2. Not committed to repository
3. Reported through secure channels
