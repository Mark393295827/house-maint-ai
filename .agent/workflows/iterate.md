---
description: Run the automatic iteration SDA loop (Simulate-Deploy-Augment)
---

# Automatic Iteration Workflow

// turbo-all

## Prerequisites

Ensure all tests pass before starting iteration:

```bash
npm run test
```

## 1. SIMULATE Phase

Run full verification in sandbox:

```bash
npm run lint && npm run test && npm run build
```

Expected: All checks pass with 0 errors.

## 2. DEPLOY Phase (Canary)

For canary deployment, create a feature branch:

```bash
git checkout -b canary/[feature-name]
git push origin canary/[feature-name]
```

Monitor deployment via GitHub Actions.

## 3. AUGMENT Phase

Review telemetry and make adjustments:
- Check Sentry for errors
- Review performance metrics
- Apply learnings to codebase

## Full Cycle

To run complete SDA iteration:

1. Simulate: Run tests and build
2. Deploy: Push to canary branch
3. Augment: Review and iterate

## Rollback

If issues detected during canary:

```bash
git checkout main
git branch -D canary/[feature-name]
git push origin --delete canary/[feature-name]
```
