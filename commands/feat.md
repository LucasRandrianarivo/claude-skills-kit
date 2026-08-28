---
description: Full feature orchestration — analysis, clarification, plan, code, tests, review
argument-hint: "<feature description>"
---

# /feat — Feature Development Orchestrator

## Usage
```
/feat <feature description>
```

## Overview
A 7-phase orchestrated workflow for developing features from scratch. Stack-agnostic — reads project conventions from CLAUDE.md and existing code.

---

## Phase 1: Capture

Gather the feature requirements from the user's description and the conversation context.

- Parse `$ARGUMENTS` as the feature description
- If the description is vague, ask up to 3 clarifying questions before proceeding
- Identify: **what** the feature does, **who** it's for, **where** it lives in the codebase

Output a structured brief:
```
Feature: <name>
Goal: <one sentence>
Scope: <files/modules affected>
```

## Phase 2: Analysis (Parallel Agents)

Launch parallel analysis using subagents:

| Agent | Task |
|-------|------|
| `code-architect` | Validate where new files should go, check dependency direction, identify patterns to follow |
| `code-reviewer` | Review existing related code for conventions, naming, and patterns to replicate |

Read the project's `CLAUDE.md` for:
- File/folder conventions
- Naming conventions
- Import/export patterns
- State management patterns

## Phase 3: Clarify

Present findings from Phase 2 to the user:

- Proposed file locations and names
- Patterns that will be followed
- Any architectural concerns or trade-offs
- Dependencies that will be added or modified

Ask the user to confirm or adjust before proceeding. If the user says "go" or "looks good", proceed.

## Phase 4: Plan

Create an execution plan as a numbered checklist:

```
Plan:
1. [ ] Create <file> — <purpose>
2. [ ] Modify <file> — <what changes>
3. [ ] Create <file> — <purpose>
4. [ ] Add tests in <file>
5. [ ] Update <config/route/index> if needed
```

- Order by dependency (create dependencies before dependents)
- Group related changes together
- Include test files in the plan

## Phase 5: Execute

Implement the plan step by step:

- Follow existing project conventions exactly (read CLAUDE.md and neighboring files)
- Match the codebase's style: indentation, quotes, semicolons, naming
- Reuse existing utilities, helpers, and shared components — do NOT duplicate
- After each file, verify it has no syntax errors
- Mark each plan item as complete: `[x]`

**Rules during execution:**
- Never install new dependencies without asking
- Never modify unrelated files
- Never change existing public interfaces without flagging it
- Keep functions small and focused

## Phase 6: Test

Run the project's test suite:

1. Read `CLAUDE.md` or `package.json` (or equivalent) for the test command
2. Run the test command
3. If tests fail:
   - Diagnose the failure
   - Fix the issue
   - Re-run tests
   - Repeat until green (max 3 iterations)
4. If no test command exists, inform the user

Run the project's lint/typecheck if available:
1. Read build/lint commands from project config
2. Run them and fix any errors introduced by the new code

## Phase 7: Review

Perform a self-review of all changes:

1. Run `git diff` to see all modifications
2. Check each change against:
   - [ ] Follows project conventions
   - [ ] No dead code or debug statements left
   - [ ] No hardcoded values that should be constants
   - [ ] Error handling is present where needed
   - [ ] No security issues (exposed secrets, unvalidated input)
3. Present a summary:

```
Summary:
- Files created: <count>
- Files modified: <count>
- Tests: <pass/fail>
- Lint: <pass/fail>

Changes:
- <file>: <what was done>
- <file>: <what was done>
```

4. Ask the user if they want to commit (suggest running `/commit` if available)
