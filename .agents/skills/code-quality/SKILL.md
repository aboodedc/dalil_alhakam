---
name: code-quality
description: >-
  Use this skill when writing or reviewing code to ensure consistent quality,
  error handling, TypeScript best practices, and performance patterns. Covers
  naming conventions, type safety, error boundaries, accessibility, and
  code review checklist for this Next.js project.
---

# Code Quality & Best Practices Skill

## Overview

This skill enforces code quality standards, TypeScript best practices, error
handling patterns, and performance optimization for this Next.js project.

---

## 1. TypeScript Strict Patterns

### Always define prop interfaces

```tsx
// ✅ Good — explicit interface
interface StatsCardProps {
  title: string;
  value: number;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, trend, icon }: StatsCardProps) {
  // ...
}

// ❌ Bad — inline or any
export function StatsCard(props: any) { /* ... */ }
```

### Use `as const` for constant arrays/objects

```tsx
// ✅ Good
const STATUSES = ["active", "inactive", "pending"] as const;
type Status = (typeof STATUSES)[number]; // "active" | "inactive" | "pending"

// ❌ Bad
const STATUSES = ["active", "inactive", "pending"]; // string[]
```

### Avoid `any` — use `unknown` when type is truly unknown

```tsx
// ✅ Good
function parseResponse(data: unknown): User {
  if (isUser(data)) return data;
  throw new Error("Invalid data");
}

// ❌ Bad
function parseResponse(data: any): User { /* ... */ }
```

### Use discriminated unions for state

```tsx
// ✅ Good
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };
```

---

## 2. Error Handling

### Every route segment should have an `error.tsx`

```tsx
// app/(main)/dashboard/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### Use `loading.tsx` for every data-fetching page

```tsx
// app/(main)/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
```

### Server Action error handling

```tsx
"use server";

export async function createItem(formData: FormData) {
  try {
    const validated = schema.parse(Object.fromEntries(formData));
    const result = await db.insert(items).values(validated);
    revalidatePath("/items");
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    return { success: false, errors: { _form: ["An unexpected error occurred"] } };
  }
}
```

---

## 3. Performance Patterns

### Lazy load heavy components

```tsx
import dynamic from "next/dynamic";

const ChartSection = dynamic(
  () => import("./_components/chart-section").then((m) => m.ChartSection),
  {
    loading: () => <Skeleton className="h-64" />,
  }
);
```

### Use `React.memo` for expensive list items

```tsx
const ActivityItem = React.memo(function ActivityItem({ item }: { item: Activity }) {
  return (
    <div className="flex items-center gap-3 p-3">
      {/* ... */}
    </div>
  );
});
```

### Image optimization

Always use `next/image` instead of `<img>`:

```tsx
import Image from "next/image";

<Image
  src="/hero.png"
  alt="Hero image"
  width={800}
  height={400}
  priority // for above-the-fold images
/>
```

---

## 4. Accessibility (a11y) Requirements

Every component **must** follow these rules:

1. **All interactive elements** need accessible labels.
2. **Color contrast** must meet WCAG 2.1 AA (4.5:1 for text, 3:1 for large text).
3. **Focus indicators** must be visible — never remove `outline` without replacement.
4. **Semantic HTML** — use `<nav>`, `<main>`, `<section>`, `<article>`, `<button>`.
5. **ARIA attributes** only when semantic HTML is insufficient.

```tsx
// ✅ Good
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon className="h-4 w-4" />
</button>

// ❌ Bad
<div onClick={onClose}>
  <XIcon className="h-4 w-4" />
</div>
```

---

## 5. File Size Limits

| File Type        | Max Lines | Action if exceeded                  |
| :--------------- | :-------: | :---------------------------------- |
| Component        |    150    | Split into sub-components           |
| Page             |     80    | Extract sections to `_components/`  |
| Utility          |    100    | Split into focused utility files    |
| Hook             |     80    | Ensure single responsibility        |
| Type definitions |    100    | Split by domain                     |

---

## 6. Code Review Checklist

Before completing any code change, verify:

- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Props have explicit TypeScript interfaces
- [ ] No `any` types (use `unknown` if needed)
- [ ] Error boundary exists for the route
- [ ] Loading state exists for data-fetching pages
- [ ] All images use `next/image`
- [ ] Interactive elements are keyboard accessible
- [ ] Component is in the correct folder (shared vs page-specific)
- [ ] Imports follow the ordering convention
- [ ] File name is `kebab-case.tsx`
