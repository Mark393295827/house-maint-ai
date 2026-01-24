# Strategic Compact Hook

This directory contains strategic compaction utilities for context management.

## Purpose

Optimize context window usage by:
- Suggesting what content can be compacted
- Prioritizing retention of critical information
- Maintaining coherent conversation flow

## Files

- `../scripts/hooks/suggest-compact.js` - Main compaction logic

## Usage

Triggered automatically when context usage exceeds threshold, or manually via:
```
/compact suggest
```

## Configuration

See `hooks.json` for configuration:
```json
{
  "strategic_compact": {
    "enabled": true,
    "threshold": 85,
    "auto_suggest": true
  }
}
```
