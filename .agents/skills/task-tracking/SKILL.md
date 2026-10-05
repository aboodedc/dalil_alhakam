---
name: task-tracking
description: >-
  Use this skill whenever a task is created, started, completed, or needs status
  tracking. Maintains a tasks.md file in the project root that acts as a living
  task board. Use this to add new tasks, update task status, and track all work
  items throughout the project lifecycle.
---

# Task Tracking Skill

## Overview

This skill manages a `tasks.md` file in the project root that serves as a
centralized task tracker. Every feature, bug fix, refactor, or improvement
should be recorded here.

---

## 1. File Location

The task file **must always** be at:

```
d:\Projects\dalil-al-ahkam-hakthon\tasks.md
```

If it does not exist, create it with the template in Section 3.

---

## 2. Task Statuses

| Status          | Emoji | Meaning                                  |
| :-------------- | :---: | :--------------------------------------- |
| `TODO`          |  📋  | Not started yet                          |
| `IN_PROGRESS`   |  🔄  | Currently being worked on                |
| `DONE`          |  ✅  | Completed and verified                   |
| `BLOCKED`       |  🚫  | Cannot proceed — dependency or issue     |
| `REVIEW`        |  👀  | Completed, awaiting review               |
| `CANCELLED`     |  ❌  | No longer needed                         |

---

## 3. File Template

When creating `tasks.md` for the first time, use this template:

```markdown
# 📋 Project Tasks — Dalil Al-Ahkam

> Last updated: YYYY-MM-DD HH:mm

---

## Summary

| Status | Count |
| :----- | :---: |
| 📋 TODO | 0 |
| 🔄 IN_PROGRESS | 0 |
| ✅ DONE | 0 |
| 🚫 BLOCKED | 0 |
| 👀 REVIEW | 0 |

---

## Tasks

### 🏗️ Setup & Infrastructure

_No tasks yet._

### 🎨 UI / Design

_No tasks yet._

### ⚙️ Features

_No tasks yet._

### 🐛 Bugs

_No tasks yet._

### 🔧 Refactoring / Improvement

_No tasks yet._

---

## Completed Archive

_Completed tasks are moved here for reference._
```

---

## 4. Adding a Task

When adding a new task, follow this exact format:

```markdown
- [ ] 📋 **TASK-XXX**: Short description
  - **Priority**: High | Medium | Low
  - **Category**: Setup | UI | Feature | Bug | Refactor
  - **Created**: YYYY-MM-DD
  - **Notes**: Any additional context
```

### Rules for Adding Tasks

1. **Auto-increment** the task ID (TASK-001, TASK-002, etc.).
2. Always place the task under the **correct category section**.
3. Update the **Summary table** counts.
4. Update the **"Last updated"** timestamp.

---

## 5. Updating Task Status

When a task changes status:

1. Change the checkbox: `- [ ]` → `- [x]` (for DONE) or keep `- [ ]` with new emoji.
2. Update the status emoji:
   - `📋` → `🔄` (starting work)
   - `🔄` → `✅` (completed)
   - `🔄` → `🚫` (blocked)
   - `🔄` → `👀` (in review)
3. Add a completion date if DONE: `**Completed**: YYYY-MM-DD`
4. Update the **Summary table** counts.
5. Update the **"Last updated"** timestamp.

### Example: Completed Task

```markdown
- [x] ✅ **TASK-003**: Create header component
  - **Priority**: High
  - **Category**: UI
  - **Created**: 2026-10-01
  - **Completed**: 2026-10-02
```

---

## 6. Moving Completed Tasks

When a task is marked `✅ DONE`:

1. Keep it in its category section until the section gets crowded (>5 completed).
2. Then move completed tasks to the **"Completed Archive"** section at the bottom.

---

## 7. Workflow Integration

### When the user asks to build a feature:

1. **First**, add a task to `tasks.md` with status `📋 TODO`.
2. **Then**, update it to `🔄 IN_PROGRESS` when you start working.
3. **Finally**, update it to `✅ DONE` when the work is complete.

### When the user reports a bug:

1. Add a task under **🐛 Bugs** with status `📋 TODO`.
2. Include reproduction details in the **Notes** field.

### When planning work:

1. Add all planned tasks as `📋 TODO`.
2. Mark dependencies in the **Notes** field.

---

## 8. Reading Tasks

When the user asks about task status, project progress, or what's left to do:

1. Read `tasks.md` from the project root.
2. Summarize the current state using the Summary table.
3. Highlight any `🚫 BLOCKED` tasks that need attention.
