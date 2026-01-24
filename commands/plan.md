---
description: Create an implementation plan for a feature
---

# Plan Command

Use `/plan [feature]` to create a detailed implementation plan.

## Usage

```
/plan <feature-description>
/plan add user authentication
/plan refactor Dashboard component
/plan integrate payment API
```

## What It Does

1. **Analyzes** the feature requirements
2. **Breaks down** into actionable tasks
3. **Identifies** dependencies and risks
4. **Creates** a structured plan document
5. **Assigns** tasks to appropriate agents

## Plan Template

```markdown
# Implementation Plan: [Feature Name]

## Overview
Brief description of what will be implemented.

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Tasks

### Phase 1: Setup
- [ ] Task 1.1 (Est: 30min) → planner
- [ ] Task 1.2 (Est: 1hr) → architect

### Phase 2: Implementation
- [ ] Task 2.1 (Est: 2hr) → coder
- [ ] Task 2.2 (Est: 1hr) → coder

### Phase 3: Testing
- [ ] Task 3.1 (Est: 1hr) → tdd-guide
- [ ] Task 3.2 (Est: 30min) → code-reviewer

## Dependencies
- External APIs
- Libraries to install

## Risks
- Potential blockers
- Technical challenges

## Verification
How we'll know it's complete.
```

## Example

```
> /plan add dark mode support

Creating implementation plan...

# Implementation Plan: Dark Mode Support

## Tasks
- [ ] Add theme context → architect
- [ ] Update Tailwind config → coder
- [ ] Create toggle component → coder
- [ ] Add persistence → coder
- [ ] Write tests → tdd-guide
- [ ] Review → code-reviewer

Estimated time: 4 hours
```
