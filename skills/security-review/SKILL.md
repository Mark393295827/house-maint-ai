---
name: Security Review
description: Security checklist and vulnerability prevention
---

# Security Review Skill

Comprehensive security review checklist for web applications.

## OWASP Top 10 Checks

### 1. Injection Prevention
- [ ] SQL queries use parameterized statements
- [ ] NoSQL queries properly escaped
- [ ] Command injection prevented
- [ ] LDAP injection prevented

### 2. Broken Authentication
- [ ] Strong password requirements
- [ ] Secure session management
- [ ] Multi-factor where appropriate
- [ ] Account lockout implemented

### 3. Sensitive Data Exposure
- [ ] Data encrypted at rest
- [ ] Data encrypted in transit (HTTPS)
- [ ] No sensitive data in URLs
- [ ] Proper key management

### 4. XML External Entities (XXE)
- [ ] XML parsing disabled if unused
- [ ] DTD processing disabled

### 5. Broken Access Control
- [ ] Authorization checks on all endpoints
- [ ] CORS properly configured
- [ ] Directory listing disabled

### 6. Security Misconfiguration
- [ ] Default credentials changed
- [ ] Unnecessary features disabled
- [ ] Error handling doesn't leak info

### 7. Cross-Site Scripting (XSS)
- [ ] Output encoding implemented
- [ ] CSP headers configured
- [ ] No `dangerouslySetInnerHTML`
- [ ] User input sanitized

### 8. Insecure Deserialization
- [ ] Avoid deserializing untrusted data
- [ ] Validate serialized data

### 9. Known Vulnerabilities
- [ ] Dependencies audited: `npm audit`
- [ ] No outdated packages
- [ ] Security patches applied

### 10. Insufficient Logging
- [ ] Security events logged
- [ ] Logs protected
- [ ] Monitoring configured

## React-Specific Security

```jsx
// ❌ NEVER do this
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Safe approach
<div>{sanitizedContent}</div>
```

## Dependency Audit

```bash
npm audit
npm audit fix
npm audit --production
```
