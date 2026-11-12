"use client";

/**
 * Font stacks for the export stage.
 *
 * The templates use CSS custom properties (`var(--font-amiri)`) rather than
 * literal family names. `html-to-image` copies *computed* styles onto the
 * node it clones, so the variable is resolved to the real `next/font` family
 * name (`__Amiri_…`) before the snapshot is taken — which is exactly what the
 * font embedder needs to match the matching `@font-face` rule.
 */

/** UI / brand face (Readex Pro). */
export const CSS_FONT_DISPLAY = "var(--font-readex), system-ui, sans-serif";

/**
 * Naskh face for hadith text (Amiri).
 *
 * Amiri has no glyph for U+FD41 (﵁ — رضي الله عنه), the honorific the
 * corpus places after every companion's name, so Noto Naskh Arabic follows
 * in the stack: it covers the whole Arabic Presentation Forms range. Both
 * fonts are self-hosted by `next/font`, which means the export capture can
 * embed them instead of falling back to a system font.
 */
export const CSS_FONT_NASKH =
  'var(--font-amiri), var(--font-noto-naskh), "Traditional Arabic", "Noto Naskh Arabic", serif';
