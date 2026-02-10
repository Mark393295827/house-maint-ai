# SOP: Swarm Architecture Implementation

## Overview
Standard Operating Procedure for implementing and maintaining the AI swarm architecture.

## Symptoms (When to Use)
- Complex feature requests (5+ files)
- Ambiguous requirements
- Architecture changes
- Performance optimizations

## Solution Flow

```
Request → Task Router → Swarm Orchestrator
                              ↓
         [Researcher, Coder, Red Team] (parallel)
                              ↓
                    Sandbox Runner (100x)
                              ↓
                        HITL Auditor
                              ↓
                    Auto Standardizer
```

## Commands

| Action | Command |
|--------|---------|
| Run full cycle | `/iterate` |
| Simulate only | `npm run lint && npm run test && npm run build` |
| Deploy canary | `git checkout -b canary/[name] && git push origin canary/[name]` |

## Verification

After each cycle:
1. Check lint: 0 errors
2. Check tests: 100% pass rate
3. Check build: Success
4. Check Sentry: No new errors

## Rollback

```bash
git checkout main
git branch -D canary/[name]
git push origin --delete canary/[name]
```

## Contacts
- Owner: Development Team
- Escalation: HITL Auditor
