---
name: shadcn-design
description: >-
  Use this skill when building UI components, pages, or layouts. Covers shadcn/ui
  component usage, file organization patterns (shared components vs page-scoped
  components), folder conventions, and design best practices for this Next.js project.
---

# shadcn/ui Design & Component Organization Skill

## Overview

This skill defines how to structure, create, and organize UI components in this
Next.js App Router project using **shadcn/ui** with **Tailwind CSS v4**.

---

## 1. shadcn/ui Setup & Usage

### Installing Components

Always use the CLI to add shadcn/ui components. Never copy-paste component code manually.

```bash
npx shadcn@latest add <component-name>
```

To add multiple components at once:

```bash
npx shadcn@latest add button card dialog input label
```

### Import Convention

All shadcn/ui primitives live under `@/components/ui/`. Import them with the `@/` alias:

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
```

### Customizing shadcn Components

- **Never** edit files inside `components/ui/` directly for project-specific logic.
- Instead, **wrap** them in a custom component inside `components/common/` or
  the page's `_components/` folder.

```tsx
// components/common/submit-button.tsx
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  loading?: boolean;
  children: React.ReactNode;
}

export function SubmitButton({ loading, children }: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
```

---

## 2. Folder Structure Convention

```text
project-root/
├── app/
│   ├── globals.css
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page (thin — delegates to _components)
│   ├── _components/             # Private: Home page components
│   │   ├── hero-section.tsx
│   │   ├── features-grid.tsx
│   │   └── cta-banner.tsx
│   │
│   ├── (auth)/                  # Route group: auth pages share a layout
│   │   ├── layout.tsx           # Auth-specific layout
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   │       ├── login-form.tsx
│   │   │       └── social-providers.tsx
│   │   └── register/
│   │       ├── page.tsx
│   │       └── _components/
│   │           ├── register-form.tsx
│   │           └── terms-checkbox.tsx
│   │
│   ├── (main)/                  # Route group: main app pages
│   │   ├── layout.tsx           # Shared sidebar + header
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   │       ├── stats-cards.tsx
│   │   │       ├── recent-activity.tsx
│   │   │       └── chart-section.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── _components/
│   │           ├── profile-form.tsx
│   │           └── notification-prefs.tsx
│   │
│   └── api/                     # API route handlers
│       └── ...
│
├── components/
│   ├── ui/                      # shadcn/ui primitives (auto-generated, DO NOT EDIT)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   ├── common/                  # Shared project components (reused across pages)
│   │   ├── submit-button.tsx
│   │   ├── page-header.tsx
│   │   ├── search-input.tsx
│   │   ├── empty-state.tsx
│   │   ├── confirm-dialog.tsx
│   │   └── data-table.tsx
│   │
│   └── layout/                  # Layout-level shared components
│       ├── header.tsx
│       ├── sidebar.tsx
│       ├── footer.tsx
│       ├── mobile-nav.tsx
│       └── theme-toggle.tsx
│
├── lib/                         # Utility functions & shared logic
│   ├── utils.ts                 # cn() helper and general utils
│   ├── constants.ts             # App-wide constants
│   └── validations.ts           # Zod schemas or validation logic
│
├── hooks/                       # Custom React hooks
│   ├── use-debounce.ts
│   └── use-media-query.ts
│
└── types/                       # Shared TypeScript types
    └── index.ts
```

---

## 3. Component Placement Rules

### Rule 1: Shared components → `components/common/`

If a component is used by **two or more pages**, it belongs in `components/common/`.

Examples: `PageHeader`, `SearchInput`, `EmptyState`, `ConfirmDialog`, `DataTable`.

### Rule 2: Page-specific components → `app/<route>/_components/`

If a component is used **only within a single page**, it belongs in a `_components/`
folder co-located with that page. The `_` prefix makes it a **private folder** in
Next.js App Router — it will never become a route.

Examples: `LoginForm` (only in login page), `StatsCards` (only in dashboard).

### Rule 3: Layout components → `components/layout/`

Components that form the structural shell of the app (header, sidebar, footer,
navigation) live in `components/layout/`.

### Rule 4: shadcn/ui primitives → `components/ui/`

Never manually create files here. Only the shadcn CLI should manage this folder.

---

## 4. Page Decomposition Pattern

Every `page.tsx` should be **thin** — it handles data fetching and composes
section components. The actual UI is split into section components inside
`_components/`.

### Example: Dashboard Page

```tsx
// app/(main)/dashboard/page.tsx
import { StatsCards } from "./_components/stats-cards";
import { RecentActivity } from "./_components/recent-activity";
import { ChartSection } from "./_components/chart-section";

export default async function DashboardPage() {
  // Data fetching at the page level
  const stats = await getStats();
  const activity = await getRecentActivity();

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <StatsCards data={stats} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSection data={stats.chartData} />
        <RecentActivity items={activity} />
      </div>
    </div>
  );
}
```

### Decomposition Guidelines

| Component Size    | Rule                                                   |
| :---------------- | :----------------------------------------------------- |
| < 30 lines JSX    | Can stay inline in `page.tsx`                          |
| 30–80 lines JSX   | Extract to `_components/` as a separate file           |
| > 80 lines JSX    | **Must** extract AND consider splitting further        |
| Repeated pattern  | Extract to `components/common/` immediately            |
| Has its own state | Extract to `_components/` as a Client Component        |

---

## 5. Naming Conventions

| Item              | Convention                | Example                    |
| :---------------- | :------------------------ | :------------------------- |
| Component files   | `kebab-case.tsx`          | `stats-cards.tsx`          |
| Component exports | `PascalCase`              | `export function StatsCards` |
| Folders           | `kebab-case`              | `_components`, `common`    |
| Route groups      | `(group-name)`            | `(auth)`, `(main)`        |
| Private folders   | `_folder-name`            | `_components`, `_lib`      |
| Hooks             | `use-kebab-case.ts`       | `use-debounce.ts`          |
| Types             | `PascalCase` in kebab file | `types/index.ts`          |
| Utils             | `camelCase` functions      | `lib/utils.ts`            |

---

## 6. Client vs Server Component Rules

- **Default is Server Component** — no directive needed.
- Add `"use client"` **only** when the component needs:
  - `useState`, `useEffect`, `useRef`, or other React hooks
  - Event handlers (`onClick`, `onChange`, etc.)
  - Browser APIs (`window`, `document`, `localStorage`)
  - Third-party client libraries
- Push `"use client"` **as deep as possible** in the component tree.
- Never put `"use client"` on `layout.tsx` or `page.tsx` unless absolutely necessary.

---

## 7. Design Tokens & Theming

This project uses **Tailwind CSS v4** with CSS custom properties. All theme tokens
are defined in `globals.css`.

### Adding New Design Tokens

```css
/* app/globals.css */
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;
  --border: #e4e4e7;
  --radius: 0.5rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --primary: #3b82f6;
    --primary-foreground: #ffffff;
    --muted: #27272a;
    --muted-foreground: #a1a1aa;
    --border: #3f3f46;
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --radius: var(--radius);
}
```

---

## 8. Import Order Convention

Enforce consistent import ordering in every file:

```tsx
// 1. React / Next.js
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// 2. Third-party libraries
import { z } from "zod";

// 3. shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 4. Common / layout components
import { PageHeader } from "@/components/common/page-header";

// 5. Page-specific components (relative imports)
import { LoginForm } from "./_components/login-form";

// 6. Lib / utils / hooks / types
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import type { User } from "@/types";
```

---

## 9. Checklist Before Creating a Component

1. [ ] Does a similar component already exist in `components/common/`?
2. [ ] Is it page-specific or shared? → Place accordingly.
3. [ ] Does it need client interactivity? → Add `"use client"` only if yes.
4. [ ] Can it be composed from existing shadcn/ui primitives?
5. [ ] Is the file name `kebab-case.tsx`?
6. [ ] Is the export `PascalCase`?
7. [ ] Are props defined with a TypeScript interface?
8. [ ] Does it follow the import order convention?
