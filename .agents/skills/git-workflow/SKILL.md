---
name: git-workflow
description: >-
  Use this skill when making commits, creating branches, or managing version
  control. Defines commit message format, branching strategy, and PR conventions
  for this project.
---

# Git Workflow Skill

## Overview

Standardized Git workflow for consistent version control, meaningful commit
history, and clean branching.

---

## 1. Commit Message Format

Use **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]
```

### Types

| Type       | When to Use                                     |
| :--------- | :---------------------------------------------- |
| `feat`     | New feature or functionality                    |
| `fix`      | Bug fix                                         |
| `ui`       | UI/styling changes only                         |
| `refactor` | Code restructuring without behavior change      |
| `docs`     | Documentation changes                           |
| `chore`    | Build, config, dependencies                     |
| `test`     | Adding or updating tests                        |
| `perf`     | Performance improvement                         |

### Scope

Use the route or component name:

```
feat(dashboard): add stats cards section
fix(auth): handle expired token redirect
ui(header): update mobile nav breakpoint
refactor(search): extract filter logic to hook
chore: update shadcn button component
```

### Rules

- **Lowercase** everything.
- **No period** at the end.
- **Max 72 characters** for the first line.
- Use **imperative mood**: "add feature" not "added feature".
- Reference task IDs when applicable: `feat(search): add filter panel (TASK-012)`

---

## 2. Branching Strategy

```
main (production-ready)
├── dev (integration branch)
│   ├── feat/TASK-001-search-page
│   ├── fix/TASK-005-login-redirect
│   └── ui/TASK-008-dark-mode
```

### Branch Naming

```
<type>/TASK-<id>-<short-kebab-description>
```

Examples:
- `feat/TASK-001-search-page`
- `fix/TASK-005-login-redirect`
- `ui/TASK-008-responsive-header`
- `refactor/TASK-012-extract-hooks`

---

## 3. Commit Granularity

### One logical change per commit

```bash
# ✅ Good — focused commits
git commit -m "feat(dashboard): add stats-cards component"
git commit -m "feat(dashboard): add chart-section component"
git commit -m "feat(dashboard): compose page from sections"

# ❌ Bad — monolithic commit
git commit -m "feat: build entire dashboard page"
```

---

## 4. Pre-Commit Checks

Before committing, always run:

```bash
npx tsc --noEmit     # Type check
npm run lint          # ESLint
```

If either fails, fix before committing.
