---
name: responsive-design
description: >-
  Use this skill for ALL UI work to guarantee fully responsive, mobile-first
  layouts on every screen size. Covers Tailwind CSS v4 breakpoints, fluid
  containers, grid/flex patterns, responsive typography, images, navigation,
  tables, forms, RTL/Arabic support, touch targets, and the mandatory
  responsive checklist.
---

# Responsive Design Skill — Mobile-First, Every Screen

## Overview

Every component, page, and layout in this project **must** be responsive by
default. There is no "desktop-only" or "add mobile later". Design mobile-first,
then enhance upward with Tailwind breakpoints.

This project uses **Tailwind CSS v4** (CSS-based config, no `tailwind.config.js`)
+ **shadcn/ui** + Arabic/RTL content.

---

## 1. Breakpoints (Tailwind v4 Defaults)

Mobile-first: unprefixed styles apply to mobile, prefixed styles add on top.

| Prefix | Min-width | Target              | Use for                        |
| :----- | :-------- | :------------------ | :----------------------------- |
| _(none)_ | 0px     | Mobile portrait     | Base styles — always write this first |
| `sm:`  | 640px     | Large phones / small tablets | 2-col grids, larger padding |
| `md:`  | 768px     | Tablets             | Sidebar collapse point, 2-3 cols |
| `lg:`  | 1024px    | Laptops             | Sidebar visible, 3-4 cols      |
| `xl:`  | 1280px    | Desktops            | Max content width, 4-6 cols    |
| `2xl:` | 1536px    | Large desktops      | Cap container, avoid full-bleed text |

Rule: never skip the base (mobile) style. `hidden lg:block` is fine;
`block` with no mobile fallback that overflows is not.

```tsx
// ✅ Good — mobile-first
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

// ❌ Bad — desktop-first, breaks on mobile
<div className="grid grid-cols-4 gap-4">
```

---

## 2. Mandatory Rules (Apply to Every Component)

1. **No fixed widths.** Never use `w-[1200px]`, `w-screen` on inner content,
   or fixed `px` widths. Use `w-full max-w-*`, `min-w-0`, percentages.
2. **No horizontal overflow.** Page must never scroll sideways at 360px width.
   Add `min-w-0` to flex/grid children that contain text, and `overflow-x-auto`
   only on intentional scrollers (tables, code, tab lists).
3. **Fluid container on every page.** Wrap page content:
   `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`.
4. **Stack on mobile, row on desktop.** Default `flex-col`, upgrade to
   `md:flex-row`. Default `grid-cols-1`, upgrade to `sm/md/lg:grid-cols-*`.
5. **Touch targets ≥ 44px.** Buttons, links, icon buttons: `h-11 min-h-[44px]`
   or `size-11` for icon-only. Never rely on hover-only interactions.
6. **Text must scale + wrap.** Use fluid type (Section 4). Always include
   `break-words` / `truncate` + `min-w-0` where user content (Arabic titles,
   long rulings) can overflow.
7. **Test at 360px, 768px, 1024px, 1440px** before marking work done.

---

## 3. Layout Patterns — Copy These

### 3.1 Page container

```tsx
<div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
  {children}
</div>
```

### 3.2 Responsive grid (cards, stats, features)

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map((item) => <Card key={item.id} />)}
</div>
```

### 3.3 Two-column content + sidebar (collapses on mobile)

```tsx
<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
  <main className="min-w-0">{/* main content */}</main>
  <aside className="min-w-0">{/* stacks below on mobile */}</aside>
</div>
```

### 3.4 Flex stack → row

```tsx
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <h1 className="text-2xl font-bold sm:text-3xl">Title</h1>
  <div className="flex flex-col gap-2 sm:flex-row">{/* actions */}</div>
</div>
```

### 3.5 Header / navigation

- Mobile: hamburger → `Sheet` (shadcn) drawer. Never shrink desktop nav with `hidden overflow`.
- Desktop: `hidden md:flex` for inline nav, `md:hidden` for trigger.

```tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

<nav className="flex h-16 items-center justify-between px-4 sm:px-6">
  <Logo />
  <div className="hidden items-center gap-6 md:flex">{/* desktop links */}</div>
  <Sheet>
    <SheetTrigger className="md:hidden" aria-label="Open menu">☰</SheetTrigger>
    <SheetContent side="right">{/* mobile links, min-h-[44px] each */}</SheetContent>
  </Sheet>
</nav>
```

For RTL (Arabic): use `side="left"` for the drawer mirror, or keep `side="right"`
if it matches `dir="rtl"` start side — verify visually.

### 3.6 Tables → cards on mobile

Never let a table force page overflow. Two allowed patterns:

```tsx
// Option A: horizontal scroll wrapper (simplest)
<div className="overflow-x-auto rounded-lg border">
  <Table className="min-w-[640px]" />
</div>

// Option B: table on md+, stacked cards on mobile (preferred for readability)
<div className="hidden md:block"><DataTable /></div>
<div className="grid grid-cols-1 gap-3 md:hidden">{/* Card per row */}</div>
```

### 3.7 Forms

```tsx
<form className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div className="sm:col-span-2"><Input /></div> {/* full-width field */}
  <div><Input /></div>
  <div><Input /></div>
  <Button className="h-11 w-full sm:w-auto">Submit</Button>
</form>
```

Inputs: `h-11 text-base` (16px prevents iOS zoom). Buttons full-width on mobile,
auto-width on `sm+`.

### 3.8 Dialog / Sheet

- `Dialog` on desktop, `Sheet` (bottom sheet) or full-screen on mobile.
- shadcn `DialogContent`: add `max-h-[90dvh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-lg`.

---

## 4. Responsive Typography & Spacing

Use stepped scale, not a single fixed size:

```tsx
<h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
<p className="text-sm leading-7 sm:text-base">
```

| Element | Mobile | sm+ | lg+ |
| :------ | :----- | :-- | :-- |
| `h1`    | `text-2xl` | `text-3xl` | `text-4xl` |
| `h2`    | `text-xl` | `text-2xl` | `text-3xl` |
| body    | `text-sm` | `text-base` | `text-base` |
| padding | `p-4` | `p-6` | `p-8` |
| section gap | `space-y-6` | `space-y-8` | `space-y-10` |

Arabic text runs longer/taller than Latin — keep `leading-7 sm:leading-8` for
body, never `truncate` multi-line Arabic headings (use `line-clamp-2` instead).

---

## 5. Images & Media

Always use `next/image` with responsive sizing:

```tsx
import Image from "next/image";

<Image
  src="/hero.png"
  alt="Description"
  width={1200}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  className="h-auto w-full rounded-lg object-cover"
/>
```

- Hero: `aspect-video w-full object-cover`.
- Avatars/icons: fixed `size-*`, never scale with viewport.
- Video/iframe embeds: wrap in `aspect-video w-full overflow-hidden`.

---

## 6. RTL / Arabic Requirements (دليل الأحكام)

This project serves Arabic content. Every responsive layout must also be RTL-correct:

1. **Use logical properties.** Never `ml-/mr-/pl-/pr-/text-left/text-right`.
   Use `ms-/me-/ps-/pe-/start-/end-` and `text-start/end`:
   ```tsx
   // ✅ Good
   <div className="ms-4 ps-4 text-start">
   // ❌ Bad — breaks in RTL
   <div className="ml-4 pl-4 text-left">
   ```
2. **Set `dir="rtl"` + `lang="ar"`** on Arabic layouts. Root `app/layout.tsx`
   is currently `lang="en"` — Arabic routes must override via route-group layout.
3. **Mirror directional icons** (`ArrowRight`, `ChevronRight`) with
   `rtl:rotate-180`. Non-directional icons (search, menu) stay as-is.
4. **Test both directions** at mobile width — drawer side, text alignment,
   flex order all flip.

---

## 7. Anti-Patterns — Never Do This

| ❌ Anti-pattern | Why it breaks | ✅ Fix |
| :-------------- | :------------ | :----- |
| `grid-cols-3` with no base | 3 cramped cols on 360px | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `w-[900px]` / `min-w-[800px]` | Forces horizontal scroll | `w-full max-w-3xl` |
| `hidden sm:block` with no mobile alternative | Content disappears on phones | Provide stacked/card fallback |
| `text-4xl` fixed on h1 | Overflows small screens | Stepped scale (Section 4) |
| `flex` row with long text, no `min-w-0` | Text pushes layout off-screen | Add `min-w-0 flex-1 break-words` |
| `ml-auto` for spacing in RTL | Wrong side in Arabic | `ms-auto` |
| `h-screen` on mobile sections | Browser chrome cuts content | `min-h-dvh` |

---

## 8. Verification Checklist (Mandatory)

Before marking any UI task DONE, verify all of these:

- [ ] 360px: no horizontal scrollbar, no clipped text/buttons
- [ ] 768px: grid collapses sensibly, nav switches to hamburger
- [ ] 1024px+: sidebar/columns appear, container capped at `max-w-7xl`
- [ ] All touch targets ≥ 44px (`h-11` / `size-11`)
- [ ] Tables scroll inside wrapper or convert to cards — page never overflows
- [ ] Typography uses stepped scale, Arabic wraps with `break-words` / `line-clamp`
- [ ] Only logical properties (`ms/me/ps/pe/start/end`), no `ml/mr/pl/pr`
- [ ] Images use `next/image` + `sizes`, no layout shift
- [ ] Keyboard + screen-reader pass (focus visible, `aria-label` on icon buttons)
- [ ] Tested with `dir="rtl"` if page contains Arabic

Quick manual test: DevTools → device toolbar → 360×800, 768×1024, 1280×800;
check each for overflow via `document.documentElement.scrollWidth <= window.innerWidth`.
