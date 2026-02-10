---
name: SDA Controller
description: Simulate-Deploy-Augment loop replacing traditional PDCA
---

# SDA Controller Skill

Replaces traditional PDCA (Plan-Do-Check-Act) with a faster, AI-native iteration loop.

## SDA vs PDCA

| PDCA | SDA | Improvement |
|------|-----|-------------|
| Plan | Simulate | Test before building |
| Do | Deploy | Canary first |
| Check | Augment | Real-time learning |
| Act | (Continuous) | No manual cycle |

## SDA Loop

```
┌─────────────────────────────────────────────┐
│                                             │
│  SIMULATE ──► DEPLOY ──► AUGMENT            │
│      ▲                       │              │
│      └───────────────────────┘              │
│                                             │
└─────────────────────────────────────────────┘
```

## Phase Definitions

### 1. SIMULATE
Run solution in high-fidelity sandbox before any real deployment.

```yaml
simulate:
  environment: sandbox
  actions:
    - Run test suite: `npm run test`
    - Build check: `npm run build`
    - Load test: `npm run load-test:smoke`
  success_criteria:
    tests_pass: true
    build_success: true
    performance_threshold: "p95 < 200ms"
```

### 2. DEPLOY
Small-scale canary release with rollback capability.

```yaml
deploy:
  strategy: canary
  initial_traffic: 5%
  ramp_schedule:
    - 5%: 10min
    - 25%: 30min
    - 50%: 1hr
    - 100%: 2hr
  rollback_trigger:
    error_rate: "> 1%"
    latency_p99: "> 500ms"
```

### 3. AUGMENT
Agents learn from telemetry, adjusting in real-time.

```yaml
augment:
  telemetry_sources:
    - Error logs
    - Performance metrics
    - User feedback signals
  feedback_actions:
    - Auto-fix common patterns
    - Generate hotfix PRs
    - Update configuration
  learning_loop:
    - Store successful patterns
    - Avoid failed approaches
```

## Workflow Commands

```bash
/iterate simulate    # Run simulation only
/iterate deploy      # Deploy with canary
/iterate full        # Complete SDA cycle
/iterate rollback    # Emergency rollback
```

## Integration Points

| Component | Purpose |
|-----------|---------|
| `eval-harness` | Powers SIMULATE phase |
| `verification-loop` | Continuous checks |
| GitHub Actions | DEPLOY automation |
| Sentry | AUGMENT telemetry |

## Success Metrics

| Metric | Target |
|--------|--------|
| Simulation pass rate | 100% |
| Canary success rate | > 99% |
| Mean time to augment | < 5min |
| Rollback frequency | < 1% |
