---
name: Backend Patterns
description: API, database, and caching patterns
---

# Backend Patterns Skill

Patterns for API design, database operations, and caching strategies.

## API Design

### RESTful Endpoints

```
GET    /api/items         # List all
GET    /api/items/:id     # Get one
POST   /api/items         # Create
PUT    /api/items/:id     # Update
DELETE /api/items/:id     # Delete
```

### Response Format

```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

### Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid format" }
    ]
  }
}
```

## Service Pattern

```javascript
// services/api.js
const API_BASE = '/api';

export async function fetchItems(params) {
  const response = await fetch(`${API_BASE}/items?${new URLSearchParams(params)}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function createItem(data) {
  const response = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

## Caching Strategies

### Browser Cache
```javascript
// Cache-Control headers
'Cache-Control': 'public, max-age=3600'
```

### In-Memory Cache
```javascript
const cache = new Map();

function getCached(key, fetchFn, ttl = 60000) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < ttl) {
    return cached.data;
  }
  const data = fetchFn();
  cache.set(key, { data, time: Date.now() });
  return data;
}
```

## Error Handling

```javascript
async function apiCall(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error.status === 401) {
      // Handle auth error
    } else if (error.status === 404) {
      // Handle not found
    } else {
      // Handle generic error
    }
    throw error;
  }
}
```
