---
name: Deployment Patterns
description: Strategies for reliable deployment and CI/CD
---

# Deployment Patterns

## When to Activate
- Designing a deployment pipeline
- Configuring CI/CD workflows
- Preparing for a production release
- Debugging deployment failures

## Deployment Strategies

### Rolling Deployment (Default)
Updates instances one by one.
- **Pros**: No downtime, low cost
- **Cons**: Slow rollback, mixed versions during update

### Blue-Green Deployment
Spin up a parallel "Green" environment with the new version. Switch traffic when ready.
- **Pros**: Instant rollback, no mixed versions
- **Cons**: Double resource cost

### Canary Deployment
Route a small % of traffic (e.g. 5%) to the new version.
- **Pros**: Safe testing in prod
- **Cons**: Complex routing setup

## CI/CD Pipeline

### GitHub Actions (Standard Pipeline)
```yaml
name: CI/CD
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: docker/build-push-action@v5
        with:
          tags: myapp:${{ github.sha }}
          push: true
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Prod
        run: ./deploy.sh myapp:${{ github.sha }}
```

## Health Checks
Essential for zero-downtime deployments.

### Health Check Endpoint
```typescript
// GET /health
app.get('/health', (req, res) => {
  // Check DB connection
  // Check Redis connection
  // Check disk space
  if (isHealthy) res.status(200).send('OK');
  else res.status(503).send('Unhealthy');
});
```

### Kubernetes Probes
- **Liveness Probe**: "Am I alive?" (Restart if no)
- **Readiness Probe**: "Am I ready for traffic?" (Remove from load balancer if no)

## Environment Configuration
Follow the **Twelve-Factor App** methodology.

1. **Store config in environment variables**
2. **Strict separation of config from code**
3. **Never commit `.env` files**

## Production Readiness Checklist

### Application
- [ ] Structured logging (JSON)
- [ ] Error tracking (Sentry)
- [ ] Graceful shutdown handling

### Infrastructure
- [ ] Auto-scaling configured
- [ ] Database backups automated
- [ ] CDN for static assets

### Security
- [ ] HTTPS everywhere
- [ ] Secrets management (Vault/AWS Secrets Manager)
- [ ] DDoS protection (Cloudflare/AWS Shield)

### Operations
- [ ] Runbooks for common incidents
- [ ] On-call schedule
- [ ] Monitoring dashboard (Grafana/Datadog)
