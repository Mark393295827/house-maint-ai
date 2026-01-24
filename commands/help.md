---
description: Display available commands and agent capabilities
---

# Help Command

Use `/help` to display available commands and get information about agent capabilities.

## Usage

```
/help [topic]
```

## Topics

### `/help` or `/help commands`
Lists all available commands.

### `/help agents`
Shows available agents and their roles:
- **Planner**: Default agent for analyzing requests and planning
- **Coder**: Handles code implementation tasks
- **Reviewer**: Reviews code for quality and best practices

### `/help skills`
Lists available skills:
- **eval-harness**: Testing and verification
- **react-components**: React component patterns

### `/help workflows`
Lists available workflows:
- **dev-server**: Start development server
- **test**: Run test suite
- **build**: Build for production

## Example Output

```
📚 Available Commands

  /help        - Show this help message
  /checkpoint  - Save progress checkpoint

🤖 Agents: planner, coder, reviewer
🛠️ Skills: eval-harness, react-components
📋 Workflows: dev-server, test, build

Type /help [topic] for more information.
```
