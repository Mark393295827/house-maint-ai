# Development Context

Active when developing new features or fixing bugs.

## Mode

Development mode focuses on:
- Writing new code
- Implementing features
- Fixing bugs
- Local testing

## Default Agents

Primary: **coder**
Support: **tdd-guide**

## Guidelines

1. **Test First** - Write tests before implementation
2. **Small Commits** - Commit frequently with clear messages
3. **Local Verification** - Run tests and lint before pushing
4. **Documentation** - Update docs with significant changes

## Quick Commands

```bash
npm run dev          # Start dev server
npm run test         # Run tests
npm run lint         # Check linting
npm run build        # Build for production
```

## Workflow

```
1. Create feature branch
2. Write failing tests
3. Implement feature
4. Make tests pass
5. Refactor if needed
6. Run full verification
7. Create PR
```
