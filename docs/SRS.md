# Software Requirements Specification (SRS)
# Dalil Al-Ahkam — دليل الأحكام
# Semantic Retrieval & Citation System for Juristic Hadith Texts

> Version: 1.0
> Last updated: 2026-10-01
> Status: Approved (transcribed from SRS.pdf + frontend clarifications 2026-10-01)
> Course: Software Engineering — Requirements Engineering Assignment

---

## 1. Introduction

### 1.1 Purpose

Dalil Al-Ahkam is a web-based academic retrieval platform for Sharia and Hadith
researchers. It matches natural-language juristic queries to authentic Prophetic
Hadiths within accredited legal-evidence collections (Ahadith Al-Ahkam),
providing exact academic citations and links to verified physical page scans —
without generating synthetic rulings or legal interpretations.

### 1.2 Scope

**Included (frontend v1):**

- Landing/home page, login/register pages, ask (query + results) page,
  manager (source-book admin) page, workspace (saved folders + history) page,
  report page
- Bilingual UI (Arabic RTL / English LTR toggle), mobile-first responsive
- Mock data layer (no backend yet); types + mock books, hadiths, users ready
  to be swapped for real APIs

**Excluded:**

- Real retrieval engine, real auth backend, real PDF storage, real 2FA
  verification (UI only in v1)

### 1.3 Target Users

- **Researchers/students** of Sharia: submit juristic queries, inspect citations,
  save folders, export, report errors
- **Managers/admins**: activate/suspend/update indexed Hadith editions
  (books-only scope per 2026-10-01 decision)

### 1.4 Definitions & Abbreviations

| Term | Meaning |
| :--- | :------ |
| Sanad | Transmission chain of narrators as documented in source text |
| Hukm | Authenticity rating / chain classification by accredited scholars |
| Al-Muhaqqiq | Editor/verifier of a scholarly edition |
| Ahadith Al-Ahkam | Legal-evidence Hadith collections (the only indexed corpus) |

---

## 2. Overall Description

### 2.1 Product Perspective

Standalone web app (Next.js 16, React 19, Tailwind v4). Frontend-only v1 with
mock data; backend (auth, retrieval, storage) to be integrated later.

### 2.2 Product Features (High Level)

- Email + Google OAuth login/register UI, TOTP field for admins
- Indexed source-book catalogue with edition metadata
- Free-form juristic query with book filter + clarification prompt
- Ranked top-10 results with citation, PDF scan link, export, sanad visual,
  hukm citations, relevance rating, error reporting
- User workspace: saved folders, search history
- Manager page: books table (activate/suspend/update)

### 2.3 Constraints

- Corpus restricted to Ahadith Al-Ahkam collections (§2.1)
- No synthetic fatwas/rulings (§3.4); hukm displayed as static citations only (§5.2)
- Results ≤ 10, ranked (§4.1); response ≤ 3s (NFR, backend concern)
- Bilingual AR/EN with RTL/LTR; mobile-first 360/768/1024/1440px

### 2.4 Assumptions & Dependencies

- Mock data stands in for backend APIs
- Google OAuth + TOTP are UI-only in v1
- PDF scan links are placeholder links in v1

---

## 3. Functional Requirements

### 3.1 FR-001 — Registration & Login

| Field | Detail |
| :---- | :----- |
| **ID** | FR-001 |
| **Priority** | Must Have |
| **SRS ref** | §1.1 |
| **Description** | Register/authenticate via email+password or Google OAuth2 |
| **User Story** | As a researcher, I want to log in with email or Google, so that I can save work and search privately |

**Acceptance Criteria:**

1. [ ] Login page has email + password + Google button
2. [ ] Register page has name + email + password + Google button
3. [ ] Admin login shows TOTP field (UI only)
4. [ ] Validation errors shown inline; mock submit redirects to /ask

**UI Notes:** Routes `/login`, `/register` under `(auth)` group with centered
card layout, bilingual labels.

### 3.2 FR-002 — Source Book Catalogue & Manager

| Field | Detail |
| :---- | :----- |
| **ID** | FR-002 |
| **Priority** | Must Have |
| **SRS ref** | §2.1–2.3 |
| **Description** | Display indexed books with edition metadata; manager can activate/suspend/update without downtime (mock) |
| **User Story** | As a manager, I want to activate/suspend/update editions, so that the corpus stays accredited |

**Acceptance Criteria:**

1. [ ] Manager page lists books: title, muhaqqiq, edition, publisher, volumes, status
2. [ ] Each row has activate/suspend toggle + edit (mock update)
3. [ ] Status change reflects instantly (client state, mock)
4. [ ] Corpus label states "Ahadith Al-Ahkam only"

### 3.3 FR-003 — Juristic Query Submission

| Field | Detail |
| :---- | :----- |
| **ID** | FR-003 |
| **Priority** | Must Have |
| **SRS ref** | §3.1–3.3 |
| **Description** | Free-form NL query, optional book-scope filter, clarification prompt for broad/ambiguous queries |
| **User Story** | As a researcher, I want to ask in my own words and narrow by book, so that I get precise evidence |

**Acceptance Criteria:**

1. [ ] Query textarea + book-scope select (all books or one) + submit
2. [ ] Broad query (e.g. < 3 words or flagged terms) shows clarification banner with suggestions
3. [ ] No keyword-exactness required (mock semantic ranking)

### 3.4 FR-004 — Ranked Results (no synthetic rulings)

| Field | Detail |
| :---- | :----- |
| **ID** | FR-004 |
| **Priority** | Must Have |
| **SRS ref** | §3.4, §4.1 |
| **Description** | Return top ≤10 results ranked by semantic relevance; never generate fatwas |
| **User Story** | As a researcher, I want ranked evidence texts only, so that I avoid automated verdicts |

**Acceptance Criteria:**

1. [ ] Mock returns ≤ 10 results with relevance score bar
2. [ ] Disclaimer banner: "retrieval only — no synthetic rulings"
3. [ ] Results sorted by score descending

### 3.5 FR-005 — Citation + PDF Scan + Export

| Field | Detail |
| :---- | :----- |
| **ID** | FR-005 |
| **Priority** | Must Have |
| **SRS ref** | §4.2–4.4 |
| **Description** | Each result shows book, edition, volume, page, hadith number + PDF scan link + export |
| **User Story** | As a researcher, I want complete citations and page scans, so that I can verify and cite in theses |

**Acceptance Criteria:**

1. [ ] Each card shows: book title, edition, vol, page, hadith no.
2. [ ] "View page scan (PDF)" link per result
3. [ ] Export button copies formatted citation / downloads .txt (mock PDF)

### 3.6 FR-006 — Sanad & Hukm Display

| Field | Detail |
| :---- | :----- |
| **ID** | FR-006 |
| **Priority** | Must Have |
| **SRS ref** | §5.1–5.3 |
| **Description** | Show sanad text + visual chain; hukm + alternative evaluations as static scholar-attributed citations |
| **User Story** | As a researcher, I want sanad and scholar evaluations, so that I can assess authenticity manually |

**Acceptance Criteria:**

1. [ ] Sanad string + horizontal chain visual (narrator chips)
2. [ ] Hukm badge with scholar attribution (e.g. "صحيح — الألباني")
3. [ ] Alternative evaluations listed when present; no algorithmic scoring

### 3.7 FR-007 — Workspace (save, history)

| Field | Detail |
| :---- | :----- |
| **ID** | FR-007 |
| **Priority** | Should Have |
| **SRS ref** | §6.1, §6.3 |
| **Description** | Save results to custom folders; view past queries + results (localStorage mock) |
| **User Story** | As a researcher, I want folders and history, so that long-term research continues across sessions |

**Acceptance Criteria:**

1. [ ] "Save" on result adds to folder (default folder + custom create)
2. [ ] Workspace page lists folders with saved items
3. [ ] History list of past queries with re-run link (localStorage)

### 3.8 FR-008 — Relevance Rating & Error Reports

| Field | Detail |
| :---- | :----- |
| **ID** | FR-008 |
| **Priority** | Must Have |
| **SRS ref** | §6.2 |
| **Description** | Rate relevance per result; submit detailed reports on inaccurate/text/page errors |
| **User Story** | As a researcher, I want to rate and report errors, so that data quality improves |

**Acceptance Criteria:**

1. [ ] 5-star / thumbs rating per result (mock persisted)
2. [ ] Report button opens form: type (inaccurate/text/page), details, hadith ref prefilled
3. [ ] Report page + inline dialog both work with mock success toast

---

## 4. Non-Functional Requirements

### 4.1 Performance

Mock filtering is instant; real backend must return ≤ 3s (§7.1).

### 4.2 Security

Workspace/history in localStorage namespaced per mock user; real backend must
enforce per-account confidentiality (§7.2). No secrets in frontend.

### 4.3 Accessibility

WCAG 2.1 AA: labels on all inputs, 44px targets, visible focus, semantic HTML,
color contrast ≥ 4.5:1.

### 4.4 Localization

AR (RTL, default) + EN (LTR) toggle; logical properties (`ms/me/ps/pe`);
dictionaries in `lib/i18n/`.

### 4.5 Browser Support

Latest Chrome, Firefox, Safari, Edge.

---

## 5. System Architecture

### 5.1 Tech Stack

Next.js 16.3.8 App Router, React 19, TypeScript strict, Tailwind v4
(`@import "tailwindcss"`), shadcn-style `components/ui`, `lucide-react`,
`clsx` + `tailwind-merge`.

### 5.2 Data Flow

Pages (server) → `_components` (client where interactive) → `lib/mock/`
(mock data) → localStorage for workspace. Server actions / API routes are
stubs for future backend.

### 5.3 External Integrations

None in v1 (Google OAuth + PDF links are placeholders).

---

## 6. UI/UX Requirements

### 6.1 Design System

Emerald (primary, scholarly trust) + amber accents + stone neutrals; Geist
sans/mono; cards with citation metadata; badges for hukm/status; responsive
grids.

### 6.2 Page Map

| Route | Description | SRS Ref |
| :---- | :---------- | :------ |
| `/` | Landing: hero, features, corpus preview, CTA | §2–§5 overview |
| `/login` | Email + Google + admin TOTP | FR-001 |
| `/register` | Name + email + Google | FR-001 |
| `/ask` | Query + filter + clarification + top-10 results | FR-003–FR-006, FR-008 |
| `/manager` | Books table: activate/suspend/update | FR-002 |
| `/workspace` | Saved folders + search history | FR-007 |
| `/report` | Error report form | FR-008 |

### 6.3 Navigation Flow

`/` → CTA → `/ask` (public demo) or `/login` → `/ask` → save → `/workspace`;
header links: Home, Ask, Workspace, Manager, Report + language toggle.
Footer disclaimer: no synthetic rulings.

---

## 7. Change Log

| Date | Version | Change | Author |
| :--- | :-----: | :----- | :----- |
| 2026-10-01 | 1.0 | Transcribed SRS.pdf §§1–7; added FR-001–FR-008, page map, bilingual + mock-data decisions | OpenCode |
