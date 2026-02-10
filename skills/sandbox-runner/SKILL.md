---
name: Sandbox Runner
description: Recursive sandboxing for 100+ iterations before human review
---

# Sandbox Runner Skill

Run solutions through recursive sandboxing, iterating up to 100 times before presenting to human.

## Concept

> "Let agents fail 100 times in simulation so humans see only the winning solution."

## Sandbox Loop

```
[Solution] → Sandbox → Test → Pass? → [Present to Human]
                 ↑        │
                 └── No ──┘ (iterate, max 100x)
```

## Configuration

```yaml
sandbox:
  max_iterations: 100
  early_exit_threshold: 0.95  # Confidence to stop early
  checkpoint_every: 10        # Save state every N iterations
  
  tests:
    - unit: "npm run test"
    - lint: "npm run lint"
    - build: "npm run build"
    
  success_criteria:
    all_tests_pass: true
    no_lint_errors: true
    build_success: true
```

## Iteration Protocol

### Per Iteration:
1. Apply solution
2. Run test suite
3. Collect failures
4. Analyze failures
5. Generate fix
6. Loop until pass OR max iterations

### State Tracking:
```yaml
iteration:
  number: 42
  status: running | passed | failed
  failures: ["test A", "test B"]
  fixes_attempted: [...]
  confidence: 0.72
```

## Early Exit Conditions

Stop before 100 iterations if:
- All tests pass (success)
- Confidence > 0.95
- Same failure 5x in a row (stuck)
- Critical error detected

## Output Format

```yaml
sandbox_result:
  iterations_run: 47
  final_status: passed | failed
  
  solution:
    code_changes: [...]
    confidence: 0.89
    
  iteration_log:
    - iter: 1, status: failed, fixes: [...]
    - iter: 2, status: failed, fixes: [...]
    - iter: 47, status: passed
    
  ready_for_hitl: true
```

## Integration

- **Input from**: Swarm orchestrator
- **Output to**: HITL auditor
- **Rollback**: Restore to pre-sandbox state on failure
