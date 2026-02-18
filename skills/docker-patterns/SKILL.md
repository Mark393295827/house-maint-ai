---
name: Docker Patterns
description: Best practices for Docker, Compose, and containerization
---

# Docker Patterns

## When to Activate
- Setting up a new project's Docker environment
- Optimizing existing Dockerfiles
- Debugging container networking or volume issues
- Preparing containers for production deployment

## Docker Compose for Local Development

### Standard Web App Stack
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: password

  redis:
    image: redis:alpine

volumes:
  postgres_data:
```

### Development vs Production Dockerfile
Use multi-stage builds to keep images small and secure.

```dockerfile
# Base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development
FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Builder
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
CMD ["npm", "start"]
```

## Networking

### Service Discovery
Containers in the same Compose network can reach each other by service name.
- App connects to DB at `postgres://db:5432` (not localhost)
- App connects to Redis at `redis://redis:6379`

### Exposing Only What's Needed
- Only expose ports to the host (`ports`) if you need to access them from your browser/tools.
- Internal communication (`expose`) happens automatically within the network.

## Volume Strategies

### Common Patterns
1. **Bind Mounts** (`.:/app`): Syncs code for live reloading (Dev)
2. **Anonymous Volumes** (`/app/node_modules`): Prevents host modules from overriding container modules
3. **Named Volumes** (`postgres_data:/var/lib/postgresql/data`): Persists data across restart/rebuilds

## Container Security
1. **Don't run as root**: Use `USER node` in Dockerfile
2. **Scan images**: Use `docker scan` or Trivy
3. **Secrets**: Never hardcode secrets. Use `.env` files (not committed) or Docker Secrets.

## Debugging

### Common Commands
```bash
docker-compose up -d        # Start in background
docker-compose logs -f app  # Follow logs
docker-compose exec app sh  # Shell into container
docker-compose down -v      # Nuke everything (including volumes)
```

## Anti-Patterns
- ❌ **Copying `node_modules`**: Let Docker install dependencies.
- ❌ **Using `latest` tag**: Pin versions (e.g. `node:20-alpine`).
- ❌ **Hardcoding IPs**: Always use service names.
