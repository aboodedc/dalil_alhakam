---
name: requirements-clarification
description: >-
  Use this skill before starting any feature, page, or significant piece of work
  when the requirements are vague, incomplete, or ambiguous. This skill guides
  you to ask structured clarifying questions to the user before writing any code,
  ensuring nothing is built on assumptions.
---

# Requirements Clarification Skill

## Overview

This skill enforces a **"clarify first, code second"** discipline. Before
implementing any feature or making significant design decisions, ask the user
targeted questions to eliminate ambiguity and prevent rework.

---

## 1. When to Activate This Skill

**Always** activate when:

- The user requests a new **feature or page** without full detail
- The user describes something **vaguely** (e.g., "make a search page")
- You are about to make an **assumption** about behavior, layout, or data
- Multiple **valid approaches** exist and you're unsure which to pick
- A requirement **contradicts** something in the SRS or existing code
- The task involves **user-facing decisions** (copy, flow, styling choices)

**Skip** when:

- The task is a clear bug fix with obvious resolution
- The user gives explicit, detailed instructions
- You're doing a mechanical refactor with no behavioral change

---

## 2. Question Categories

Structure your questions into these categories to be thorough:

### 📐 Scope & Boundaries

- What's included vs excluded from this feature?
- Is this a standalone page or part of an existing flow?
- What are the edge cases we need to handle?

### 👤 User & Personas

- Who is the primary user for this feature?
- Are there different user roles with different access?
- What is the expected user journey / flow?

### 🎨 UI & Design

- Should this follow an existing design pattern in the app?
- What's the layout preference (cards, table, list)?
- Does this need to support mobile / responsive?
- RTL (Arabic) support needed?
- Dark mode considerations?

### 📊 Data & Logic

- Where does the data come from (API, database, static)?
- What fields/properties does the data have?
- Are there filtering, sorting, or pagination requirements?
- What validations are needed on inputs?

### ⚡ Behavior & Interactions

- What happens on success? On error?
- Are there loading states to consider?
- Should actions require confirmation?
- Real-time updates or static data?

### 🔗 Dependencies & Integration

- Does this depend on other features being built first?
- Does it integrate with external APIs?
- Are there authentication/authorization requirements?

---

## 3. How to Ask

### Rule 1: Group related questions

Don't ask one question at a time. Group 3–7 related questions together
so the user can answer in batch.

### Rule 2: Provide options when possible

Instead of open-ended questions, offer choices:

```
❓ For the search results, which layout do you prefer?
   1. Card grid (like Google Images)
   2. List view (like Google Search)
   3. Table view (like a spreadsheet)
   4. Let me decide based on the data
```

### Rule 3: State your assumptions explicitly

If you have a reasonable default, state it and ask for confirmation:

```
❓ I'm assuming the search should support Arabic text with RTL layout.
   Is that correct, or is this English-only?
```

### Rule 4: Prioritize questions by impact

Ask the **highest-impact** questions first — the ones where a wrong
assumption would cause the most rework.

### Rule 5: Reference the SRS when applicable

If the SRS has partial info, reference it:

```
❓ The SRS (FR-005) mentions search with filters but doesn't specify
   which filters. Which of these should be available?
   - Category (worship, transactions, family, criminal)
   - Source (Quran, Hadith, scholarly opinion)
   - Date range
   - Other: ___
```

---

## 4. Question Template

Use this structured format for clarity:

```markdown
Before I start building [feature name], I need to clarify a few things:

### 📐 Scope
1. [Question about scope]
2. [Question about boundaries]

### 🎨 Design
3. [Question about layout/UI]
4. [Question about responsive/RTL]

### 📊 Data
5. [Question about data source]
6. [Question about validation]

### ⚡ Behavior
7. [Question about interactions]

> 💡 My assumptions (correct me if wrong):
> - [Assumption 1]
> - [Assumption 2]
```

---

## 5. After Getting Answers

Once the user answers:

1. **Summarize** the decisions back to the user for confirmation.
2. **Update the SRS** (`docs/SRS.md`) with the clarified requirements.
3. **Create tasks** in `tasks.md` based on the confirmed requirements.
4. **Then** start building.

---

## 6. Escalation

If the user says "just decide" or "use your best judgment":

1. State your decision clearly: _"I'll go with [choice] because [reason]."_
2. Document the decision in the SRS under the relevant feature.
3. Proceed with implementation.
4. The user can always revise later.

---

## 7. Anti-Patterns to Avoid

| ❌ Don't                                     | ✅ Do Instead                                |
| :------------------------------------------- | :------------------------------------------- |
| Ask 20+ questions at once                    | Group into 5–7 focused questions             |
| Ask obvious questions                        | Only ask when genuinely unsure               |
| Ask the same question twice                  | Track answers in SRS                         |
| Block forever waiting for answers            | State assumptions and proceed if needed      |
| Ask purely technical questions               | Focus on user-facing decisions               |
| Start coding on assumptions                  | Clarify first, then code                     |
