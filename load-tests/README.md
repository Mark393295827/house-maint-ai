# Load Testing with k6

This directory contains load testing scripts for the House Maint AI API.

## Prerequisites

Install k6 on your system:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Running Tests

### Smoke Test (Quick validation)
```bash
k6 run --env SCENARIO=smoke load-tests/api-load-test.js
```

### Load Test (Normal expected load)
```bash
k6 run --env SCENARIO=load load-tests/api-load-test.js
```

### Stress Test (Beyond normal capacity)
```bash
k6 run --env SCENARIO=stress load-tests/api-load-test.js
```

### Spike Test (Sudden traffic spikes)
```bash
k6 run --env SCENARIO=spike load-tests/api-load-test.js
```

### Custom Base URL
```bash
k6 run --env BASE_URL=http://api.example.com/api load-tests/api-load-test.js
```

## Test Scenarios

| Scenario | VUs | Duration | Purpose |
|----------|-----|----------|---------|
| smoke | 5 | 2 min | Basic sanity check |
| load | 50 | 9 min | Normal load testing |
| stress | 200 | 16 min | Find breaking points |
| spike | 500 | 5 min | Sudden traffic handling |

## Performance Thresholds

- 95% of requests complete within 500ms
- Less than 1% of requests fail
- 99% of health checks complete within 1s

## Output Examples

### HTML Report
```bash
k6 run --out html=report.html load-tests/api-load-test.js
```

### JSON Output
```bash
k6 run --out json=results.json load-tests/api-load-test.js
```

### InfluxDB (for Grafana dashboards)
```bash
k6 run --out influxdb=http://localhost:8086/k6 load-tests/api-load-test.js
```

## Test Files

- `config.js` - Shared configuration and utilities
- `api-load-test.js` - Main API load test suite

## Adding New Tests

1. Create a new test file (e.g., `my-test.js`)
2. Import shared config from `config.js`
3. Define test scenarios and thresholds
4. Run with `k6 run load-tests/my-test.js`
