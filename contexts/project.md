# House Maint AI - Project Context

## Overview

House Maint AI is a mobile-first React web application for managing home maintenance tasks and activities.

## Technology Stack

- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS 4.x
- **Routing**: React Router DOM 7.x
- **Icons**: Lucide React
- **Testing**: Vitest with Testing Library

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page-level components
├── constants/      # Static data and configurations
├── assets/         # Images and static assets
├── test/           # Test utilities and setup
├── App.jsx         # Main application component
├── main.jsx        # Entry point
└── index.css       # Global styles
```

## Design Principles

1. **Mobile-First**: All designs prioritize mobile experience
2. **Component Reusability**: Build small, focused components
3. **Accessibility**: Ensure all interactive elements are accessible
4. **Performance**: Optimize for fast loading and smooth interactions

## Automatic Iteration Framework

AI-powered problem-solving with 4 phases:

| Phase | Agent/Skill | Purpose |
|-------|-------------|---------|
| 1. Decomposition | `manager-agent` | MECE+ atomic task graphs |
| 2. Exploration | `tree-of-thoughts` | Multi-path generation & pruning |
| 3. Iteration | `sda-controller` | Simulate-Deploy-Augment loop |
| 4. Audit | `constraint-auditor` | Tesla-style redundancy removal |

Use `/iterate` to run the full SDA cycle.

## Swarm Architecture

Multi-agent swarm for complex problem solving:

```
Request → Task Router → Swarm Orchestrator
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         Researcher       Coder         Red Team
              │               │               │
              └───────────────┼───────────────┘
                              │
                       Sandbox Runner (100x)
                              │
                        HITL Auditor
                              │
                      Auto Standardizer
```

### North Star
> "Build systems that solve problems and ensure they stay solved."

See [north-star.md](file:///c:/Users/%E9%AB%98%E6%9D%B0/house-maint-ai/contexts/north-star.md) for first principles.

