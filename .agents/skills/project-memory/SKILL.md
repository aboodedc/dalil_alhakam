---
name: project-memory
description: >-
  Use this skill at the START of every conversation and before any significant
  coding task. Contains critical project knowledge, decisions, gotchas, and
  conventions that the AI must remember. Read important.md from the project root
  to load project context. Update it whenever a new important decision is made.
---

# Project Memory Skill

## Overview

This skill manages `important.md` — the project's **memory file**. It contains
critical context, decisions, gotchas, and conventions that must be remembered
across conversations to avoid repeating mistakes or contradicting past decisions.

---

## 1. File Location

```
d:\Projects\dalil-al-ahkam-hakthon\important.md
```

---

## 2. When to Read

**Always** read `important.md` at the start of:

- Every new conversation
- Any feature implementation
- Any debugging session
- Any architectural discussion

This ensures continuity between conversations.

---

## 3. When to Update

**Update** `important.md` whenever:

- A **technology decision** is made (e.g., "we chose Zustand over Redux")
- A **gotcha or bug** is discovered that could trip you up again
- The user **corrects** your approach — record the correct way
- A **project-specific convention** is established
- An **external API** behavior is documented
- A **workaround** is applied for a known issue
- The user says "remember this" or similar

---

## 4. How to Update

### Adding a new entry

Add entries under the appropriate section with:

```markdown
### [Short Title]
- **Date**: YYYY-MM-DD
- **Context**: Why this matters
- **Detail**: The actual information to remember
```

### Rules

1. **Never delete** existing entries unless they are explicitly outdated.
2. **Mark outdated** entries with `~~strikethrough~~` and a note instead of deleting.
3. Keep entries **concise** — this file should be quick to scan.
4. Group entries under the correct **category section**.

---

## 5. Categories

The file is organized into these sections:

| Section                    | What goes here                                    |
| :------------------------- | :------------------------------------------------ |
| 🛠️ Tech Stack & Config    | Versions, configs, setup specifics                |
| 📐 Architecture Decisions | Why we chose X over Y                             |
| ⚠️ Gotchas & Pitfalls     | Bugs, workarounds, things that break easily       |
| 🎨 Design Decisions       | UI/UX choices, color decisions, layout patterns   |
| 🔌 External Services      | API keys, endpoints, rate limits, behaviors       |
| 📝 User Preferences       | How the user likes things done                    |
| 🧩 Project-Specific Rules | Conventions unique to this project                |
