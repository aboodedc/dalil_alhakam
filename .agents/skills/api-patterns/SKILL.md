---
name: api-patterns
description: >-
  Use this skill when creating API routes, server actions, data fetching logic,
  or integrating with external services. Covers Next.js App Router data patterns,
  server actions, route handlers, and data layer organization.
---

# API & Data Patterns Skill

## Overview

Standardized patterns for data fetching, server actions, API route handlers,
and data layer organization in this Next.js App Router project.

---

## 1. Data Layer Structure

```text
lib/
├── api/                    # API client functions (external services)
│   ├── client.ts           # Base fetch wrapper with auth, error handling
│   └── endpoints/
│       ├── rulings.ts      # Rulings-related API calls
│       └── search.ts       # Search-related API calls
│
├── actions/                # Server Actions
│   ├── rulings.ts          # Rulings mutations
│   └── search.ts           # Search actions
│
├── queries/                # Server-side data fetching functions
│   ├── rulings.ts          # getRulings(), getRulingById(), etc.
│   └── search.ts           # searchRulings(), getFilters(), etc.
│
└── validations/            # Zod schemas for validation
    ├── rulings.ts
    └── search.ts
```

---

## 2. Server Actions Pattern

Server actions handle mutations (create, update, delete). Always define them
in `lib/actions/`.

```tsx
// lib/actions/rulings.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rulingSchema } from "@/lib/validations/rulings";

export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createRuling(formData: FormData): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData);
    const validated = rulingSchema.parse(raw);

    // Perform the mutation
    await db.insert(rulings).values(validated);

    revalidatePath("/rulings");
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation failed",
        fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }
    console.error("createRuling error:", error);
    return { success: false, error: "Failed to create ruling" };
  }
}
```

---

## 3. Data Fetching Pattern

Data queries are plain async functions used in Server Components. Define them
in `lib/queries/`.

```tsx
// lib/queries/rulings.ts
import { cache } from "react";

export const getRulings = cache(async (params?: {
  page?: number;
  limit?: number;
  category?: string;
}) => {
  const { page = 1, limit = 20, category } = params ?? {};

  const response = await fetch(`${API_BASE}/rulings?...`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch rulings: ${response.status}`);
  }

  return response.json() as Promise<RulingsResponse>;
});

export const getRulingById = cache(async (id: string) => {
  const response = await fetch(`${API_BASE}/rulings/${id}`, {
    next: { tags: [`ruling-${id}`] },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch ruling: ${response.status}`);
  }

  return response.json() as Promise<Ruling>;
});
```

### Usage in Pages

```tsx
// app/(main)/rulings/page.tsx
import { getRulings } from "@/lib/queries/rulings";

export default async function RulingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const rulings = await getRulings({
    page: Number(params.page) || 1,
    category: params.category,
  });

  return <RulingsList data={rulings} />;
}
```

---

## 4. Route Handlers (API Routes)

For custom API endpoints (webhooks, external integrations), use `route.ts`.

```tsx
// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const searchParamsSchema = z.object({
  q: z.string().min(1).max(200),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchParamsSchema.parse(
      Object.fromEntries(searchParams)
    );

    const results = await performSearch(params);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid parameters", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Search API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## 5. API Client Wrapper

For external API calls, use a centralized client with error handling:

```tsx
// lib/api/client.ts
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${process.env.API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      await response.json().catch(() => null)
    );
  }

  return response.json() as Promise<T>;
}

export { apiClient, ApiError };
```

---

## 6. Validation Schemas

All input validation uses **Zod** schemas defined in `lib/validations/`.

```tsx
// lib/validations/rulings.ts
import { z } from "zod";

export const rulingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(10, "Content must be at least 10 characters"),
  category: z.enum(["worship", "transactions", "family", "criminal"]),
  source: z.string().optional(),
  references: z.array(z.string()).default([]),
});

export type RulingInput = z.infer<typeof rulingSchema>;

export const searchSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z.object({
    category: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});
```

---

## 7. Rules Summary

1. **Mutations** → Server Actions in `lib/actions/`
2. **Reads** → Query functions in `lib/queries/`
3. **External API** → Client in `lib/api/`
4. **Validation** → Zod schemas in `lib/validations/`
5. **API endpoints** → Route handlers in `app/api/`
6. **Always** validate inputs with Zod before processing
7. **Always** return typed `ActionResult` from server actions
8. **Always** handle errors gracefully — never let raw errors reach the client
9. **Use `cache()`** from React for deduplicating server-side fetches
