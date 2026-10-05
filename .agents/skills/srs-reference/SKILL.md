---
name: srs-reference
description: >-
  Use this skill when you need to understand project requirements, check feature
  specifications, verify acceptance criteria, or reference the Software Requirements
  Specification (SRS) document. Read the SRS before implementing any major feature
  to ensure alignment with documented requirements.
---

# SRS Reference Skill

## Overview

This skill manages the project's **Software Requirements Specification (SRS)**
document. The SRS is the single source of truth for what the system should do,
its features, constraints, and acceptance criteria.

---

## 1. File Location

The SRS **must always** be at:

```
docs/SRS.md
```

If the `docs/` folder or `SRS.md` does not exist, create them using the
template in Section 3.

---

## 2. When to Read the SRS

**Always** read `docs/SRS.md` before:

- Implementing a **new feature** or page
- Making **architectural decisions** (data model, API design, routing)
- Writing **validation logic** or business rules
- Creating **UI flows** (to verify the correct user journey)
- Answering questions about **what the system should do**

**Cross-reference** the SRS when:

- A task in `tasks.md` references a feature — check SRS for full specification
- The user describes a feature verbally — verify it matches the SRS
- Resolving ambiguity — the SRS is the tiebreaker

---

## 3. SRS Template

When creating `docs/SRS.md` for the first time, use this structure:

```markdown
# Software Requirements Specification (SRS)
# Dalil Al-Ahkam — دليل الأحكام

> Version: 1.0
> Last updated: YYYY-MM-DD
> Status: Draft | In Review | Approved

---

## 1. Introduction

### 1.1 Purpose
_What is this system? What problem does it solve?_

### 1.2 Scope
_What is included and excluded from this project?_

### 1.3 Target Users
_Who are the primary users? Describe user personas._

### 1.4 Definitions & Abbreviations
_Key terms and their meanings._

---

## 2. Overall Description

### 2.1 Product Perspective
_How does this system fit into the larger context?_

### 2.2 Product Features (High Level)
_Bullet list of major features._

### 2.3 Constraints
_Technical constraints, regulatory requirements, time limits._

### 2.4 Assumptions & Dependencies
_What are we assuming? What external dependencies exist?_

---

## 3. Functional Requirements

### 3.1 Feature: [Feature Name]

| Field             | Detail                              |
| :---------------- | :---------------------------------- |
| **ID**            | FR-001                              |
| **Priority**      | Must Have / Should Have / Nice to Have |
| **Description**   | _What the feature does_             |
| **User Story**    | As a [user], I want [action], so that [benefit] |
| **Acceptance Criteria** |                               |

**Acceptance Criteria:**
1. [ ] _Criterion 1_
2. [ ] _Criterion 2_
3. [ ] _Criterion 3_

**UI Notes:**
_Describe the expected UI behavior, layout, or flow._

**API/Data Notes:**
_Describe the data model, API endpoints, or integrations needed._

---

_(Repeat Section 3.x for each feature)_

---

## 4. Non-Functional Requirements

### 4.1 Performance
_Response times, throughput expectations._

### 4.2 Security
_Authentication, authorization, data protection._

### 4.3 Accessibility
_WCAG compliance level, RTL support, screen reader compatibility._

### 4.4 Localization
_Supported languages (Arabic, English), RTL layout requirements._

### 4.5 Browser Support
_Target browsers and minimum versions._

---

## 5. System Architecture

### 5.1 Tech Stack
_Next.js, React, Tailwind, shadcn/ui, etc._

### 5.2 Data Flow
_How data moves through the system._

### 5.3 External Integrations
_Third-party APIs, services, or databases._

---

## 6. UI/UX Requirements

### 6.1 Design System
_Color palette, typography, component library references._

### 6.2 Page Map
_List of all pages with brief descriptions._

### 6.3 Navigation Flow
_How users move between pages._

---

## 7. Change Log

| Date       | Version | Change Description    | Author |
| :--------- | :-----: | :-------------------- | :----- |
| YYYY-MM-DD |   1.0   | Initial draft         |        |
```

---

## 4. How to Use the SRS During Development

### Step 1: Find the relevant requirement

Before coding, search the SRS for the feature ID (e.g., `FR-001`) or
feature name related to your current task.

### Step 2: Check acceptance criteria

The acceptance criteria define **when the feature is done**. Use them as
a checklist while implementing.

### Step 3: Verify UI/UX notes

Check Section 6 and the feature's UI Notes to ensure the implementation
matches the expected design and flow.

### Step 4: Update the SRS when requirements change

If the user changes or clarifies a requirement during development:

1. Update the relevant section in `docs/SRS.md`.
2. Add an entry to the **Change Log** (Section 7).
3. Update the **Version** number if the change is significant.

---

## 5. Linking Tasks to Requirements

Every task in `tasks.md` should reference the SRS requirement it implements:

```markdown
- [ ] 📋 **TASK-010**: Implement search page with filters
  - **Priority**: High
  - **Category**: Feature
  - **SRS Ref**: FR-005
  - **Created**: 2026-10-01
```

This creates traceability between tasks and requirements.

---

## 6. Rules

1. **Never** implement a major feature without checking the SRS first.
2. **Always** update the SRS when requirements are discovered or changed.
3. **Always** link tasks to their SRS requirement IDs.
4. The SRS is a **living document** — it evolves as the project progresses.
5. When the SRS conflicts with a verbal user request, **ask the user** to
   clarify which is correct, then update the SRS accordingly.
