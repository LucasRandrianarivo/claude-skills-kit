# Rule: Greeting — Dynamic Command Discovery

## Status: Always Active

When the user greets you, respond with a helpful overview of all available commands and agents.

---

## Trigger

Activate when the user's message is (or starts with) any of:
- `bonjour`
- `hello`
- `hi`
- `hey`
- `salut`
- `coucou`
- `hola`

## Behavior

### Step 1: Discover Available Skills

Scan the project for available commands and agents:

```bash
# Commands (slash commands the user can invoke)
ls .claude/commands/*.md 2>/dev/null

# Agents (background agents used by commands)
ls .claude/agents/*.md 2>/dev/null
```

For each file found, read the first 3 lines to extract the title and one-line description.

### Step 2: Respond with Overview

Format the response as:

```
Hello! Here's what I can help you with:

## Commands

| Command | Description |
|---------|-------------|
| `/feat` | Feature development orchestrator (7-phase workflow) |
| `/review` | Full 4-phase code review (quality, readability, architecture, security) |
| `/compact` | Quick code quality review (Phase 1 only) |
| `/simplify` | Readability review (Phase 2 only) |
| `/security-review` | Security audit (Phase 4 only) |
| `/fix-review` | Auto-fix all review issues |
| `/design-review` | Visual design audit from screenshots |
| `/debug` | Debug an issue step by step |
| `/test` | Run and diagnose tests |
| `/build` | Validate build pipeline |
| `/commit` | Create a well-formatted commit |
| ... | (list all .md files found) |

## Agents

| Agent | Role |
|-------|------|
| `code-architect` | Architecture validation |
| `code-reviewer` | Code review engine |
| `build-validator` | Build pipeline checks |
| `test-runner` | Test execution and diagnosis |
| `scaffolder` | File scaffolding from conventions |
| ... | (list all agents found) |

## Quick Start

- Start a feature: `/feat <description>`
- Review your changes: `/review`
- Fix review issues: `/fix-review`
- Debug a problem: `/debug <error>`

What would you like to do?
```

### Step 3: Adapt to What's Available

- Only list commands/agents that actually exist in the project's `.claude/` directory
- If a category (commands or agents) is empty, omit that section
- If no skills are installed at all, say so and suggest setting them up
- Read each `.md` file's first heading (`# /name — description`) to get accurate descriptions
- Do not hardcode the list — always read from the filesystem

## Rules
- Keep the greeting concise but complete
- Use a table format for easy scanning
- Include a "Quick Start" section with 3-4 common workflows
- Match the user's language if they greet in a specific language (e.g., respond in French if they say "bonjour")
- Do not overwhelm — if there are more than 15 commands, group them by category
