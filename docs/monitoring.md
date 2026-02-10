# Monitoring Configuration

## Sentry Alerts

### Error Rate Alert
```yaml
alert:
  name: swarm_error_rate
  condition: error_count > 5 per 5min
  action: notify_hitl
  severity: warning
```

### Performance Alert
```yaml
alert:
  name: build_performance
  condition: build_time > 60s
  action: log_warning
  severity: info
```

## Metrics to Track

| Metric | Target | Source |
|--------|--------|--------|
| Build time | < 30s | CI/CD logs |
| Test pass rate | 100% | Vitest |
| Lint errors | 0 | ESLint |
| Sandbox iterations | < 10 avg | Agent logs |
| HITL approval rate | > 90% | Audit logs |

## Dashboards

### SDA Cycle Health
- Build success rate (7d rolling)
- Test coverage trend
- Mean sandbox iterations

### Agent Performance
- Researcher findings per request
- Red team issues found
- Auto-standardizer SOPs created

## Log Aggregation

```yaml
logs:
  - source: sda_cycle
    fields: [phase, duration, status]
  - source: swarm_agent
    fields: [agent_name, task, confidence]
  - source: hitl_audit
    fields: [decision, reasoning_trace_length]
```
