---
name: API Design Patterns
description: Best practices for REST API design, pagination, and error handling
---

# API Design Patterns

## When to Activate
- Designing new API endpoints
- Refactoring existing APIs
- Standardizing API responses
- Reviewing API consistency

## Resource Design

### URL Structure
- Use nouns, not verbs: `/users`, not `/getUsers`
- Plural nouns for collections: `/items`, not `/item`
- Hierarchy for relationships: `/users/{id}/orders`

### Naming Rules
- **camelCase** for JSON properties (`firstName`)
- **kebab-case** for URLs (`/user-profiles`)
- **snake_case** for database columns (`first_name`)

## HTTP Methods
- **GET**: Retrieve resource (Safe, Cacheable)
- **POST**: Create resource (Non-idempotent)
- **PUT**: Replace resource (Idempotent)
- **PATCH**: Partial update (Not necessarily idempotent)
- **DELETE**: Remove resource (Idempotent)

## Response Format

### Success Response
```json
{
  "data": {
    "id": "123",
    "name": "Item 1"
  }
}
```

### Collection Response (with Pagination)
```json
{
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  },
  "links": {
    "next": "/items?page=2",
    "prev": null
  }
}
```

### Error Response
Standardize errors using RFC 7807 (Problem Details) or a consistent format.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

## Pagination

### Offset-Based (Simple)
`GET /items?page=2&limit=20`
- **Pros**: Easy to implement, jump to page
- **Cons**: Slow on large datasets, unstable if items added/deleted

### Cursor-Based (Scalable)
`GET /items?cursor=adfa823&limit=20`
- **Pros**: Fast, stable
- **Cons**: No "jump to page 100"

## Filtering, Sorting, and Search

### Filtering
`GET /items?status=active&type=admin`

### Sorting
`GET /items?sort=-created_at,name` (+ for asc, - for desc)

### Sparse Fieldsets
`GET /items?fields=id,name,email` (Reduce payload size)

## Versioning

### URL Path Versioning (Recommended)
`GET /v1/items`
- **Pros**: Explicit, easy to browse
- **Cons**: "Pollutes" URL

### Header Versioning
`Accept: application/vnd.myapi.v1+json`
- **Pros**: Cleaner URLs
- **Cons**: Harder to test in browser

## Rate Limiting
Return `429 Too Many Requests` and headers:

- `X-RateLimit-Limit`: 1000
- `X-RateLimit-Remaining`: 999
- `X-RateLimit-Reset`: 1609459200
