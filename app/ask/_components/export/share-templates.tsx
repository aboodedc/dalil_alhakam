"use client";

import type { CSSProperties } from "react";
import type { HadithResult } from "@/types";
import { formatCitationShort } from "@/lib/utils";
import { resolveSanad, truncateAtWord } from "@/lib/sanad";
import { CSS_FONT_DISPLAY, CSS_FONT_NASKH } from "./fonts";

export type ShareTemplateId =
  | "midnight"
  | "manuscript"
  | "emerald"
  | "minimal"
  | "telegram"
  | "newspaper"
  | "mosaic"
  | "spotlight";

export type ShareSizeId = "portrait" | "square" | "story" | "landscape";

/**
 * How the card is framed.
 * - `double`  — a manuscript double rule with corner ornaments
 * - `hairline`— one thin rule
 * - `rule`    — editorial rules above and below the masthead
 * - `band`    — a solid header band (channel post)
 * - `bar`     — a thick accent bar on the leading edge
 * - `none`    — no frame at all
 */
export type ShareFrame = "double" | "hairline" | "rule" | "band" | "bar" | "none";

/** How the card head is built. */
export type ShareHeader = "brand" | "masthead" | "channel" | "plain";

interface ShareTheme {
  background: string;
  glow: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  innerBorder: string;
  pattern: string;
  brand: string;
  hukmBg: string;
  hukmText: string;
  hukmBorder: string;
  quote: string;
  patternKind: "stars" | "dots" | "tiles" | "none";
}

export interface ShareTemplate {
  id: ShareTemplateId;
  nameKey: string;
  descriptionKey: string;
  theme: ShareTheme;
  frame: ShareFrame;
  header: ShareHeader;
}

export const SHARE_TEMPLATES: ShareTemplate[] = [
  {
    id: "midnight",
    nameKey: "ask.export.template.midnight",
    descriptionKey: "ask.export.template.midnight.desc",
    frame: "double",
    header: "brand",
    theme: {
      background:
        "linear-gradient(155deg, #0E1330 0%, #172052 52%, #0B2F2D 100%)",
      glow:
        "radial-gradient(circle at 80% 8%, rgba(46,242,194,0.20), transparent 42%), radial-gradient(circle at 10% 90%, rgba(97,80,234,0.32), transparent 46%)",
      text: "#F8F6FF",
      muted: "#C0C8EF",
      accent: "#2EF2C2",
      accentText: "#06251E",
      border: "rgba(46,242,194,0.38)",
      innerBorder: "rgba(255,255,255,0.13)",
      pattern: "rgba(46,242,194,0.30)",
      brand: "#F8F6FF",
      hukmBg: "rgba(46,242,194,0.14)",
      hukmText: "#8CF8DD",
      hukmBorder: "rgba(46,242,194,0.42)",
      quote: "rgba(46,242,194,0.22)",
      patternKind: "stars",
    },
  },
  {
    id: "manuscript",
    nameKey: "ask.export.template.manuscript",
    descriptionKey: "ask.export.template.manuscript.desc",
    frame: "double",
    header: "brand",
    theme: {
      background:
        "radial-gradient(circle at 18% 0%, #FFFDF8 0%, #F8F0E0 52%, #EFE3CC 100%)",
      glow:
        "radial-gradient(circle at 90% 10%, rgba(140,91,47,0.10), transparent 40%)",
      text: "#2C2418",
      muted: "#6B5B45",
      accent: "#1F513F",
      accentText: "#FFF8E8",
      border: "rgba(140,91,47,0.48)",
      innerBorder: "rgba(140,91,47,0.25)",
      pattern: "rgba(140,91,47,0.20)",
      brand: "#1F513F",
      hukmBg: "#1F513F",
      hukmText: "#F8F2E3",
      hukmBorder: "#1F513F",
      quote: "rgba(140,91,47,0.14)",
      patternKind: "stars",
    },
  },
  {
    id: "emerald",
    nameKey: "ask.export.template.emerald",
    descriptionKey: "ask.export.template.emerald.desc",
    frame: "double",
    header: "brand",
    theme: {
      background:
        "linear-gradient(160deg, #04251F 0%, #073B30 52%, #0B4C3C 100%)",
      glow:
        "radial-gradient(circle at 82% 6%, rgba(216,181,106,0.18), transparent 42%), radial-gradient(circle at 8% 92%, rgba(46,242,194,0.12), transparent 45%)",
      text: "#F8F1DE",
      muted: "#C8D8C9",
      accent: "#D8B56A",
      accentText: "#2A1F08",
      border: "rgba(216,181,106,0.46)",
      innerBorder: "rgba(216,181,106,0.22)",
      pattern: "rgba(216,181,106,0.24)",
      brand: "#F8F1DE",
      hukmBg: "rgba(216,181,106,0.14)",
      hukmText: "#EED9A8",
      hukmBorder: "rgba(216,181,106,0.42)",
      quote: "rgba(216,181,106,0.20)",
      patternKind: "stars",
    },
  },
  {
    id: "minimal",
    nameKey: "ask.export.template.minimal",
    descriptionKey: "ask.export.template.minimal.desc",
    frame: "hairline",
    header: "plain",
    theme: {
      background: "linear-gradient(180deg, #FFFFFF 0%, #F7F7FE 100%)",
      glow:
        "radial-gradient(circle at 100% 0%, rgba(97,80,234,0.10), transparent 44%)",
      text: "#12183F",
      muted: "#5D6688",
      accent: "#6150EA",
      accentText: "#FFFFFF",
      border: "rgba(97,80,234,0.24)",
      innerBorder: "rgba(18,24,63,0.08)",
      pattern: "rgba(97,80,234,0.16)",
      brand: "#12183F",
      hukmBg: "#E7E4FF",
      hukmText: "#2E2680",
      hukmBorder: "#C9C2FF",
      quote: "rgba(97,80,234,0.12)",
      patternKind: "dots",
    },
  },
  {
    // A channel post: solid header band, no frame, flat body.
    id: "telegram",
    nameKey: "ask.export.template.telegram",
    descriptionKey: "ask.export.template.telegram.desc",
    frame: "band",
    header: "channel",
    theme: {
      background: "linear-gradient(180deg, #17212B 0%, #0E1621 100%)",
      glow:
        "radial-gradient(circle at 12% 0%, rgba(41,171,226,0.18), transparent 45%)",
      text: "#F2F5F7",
      muted: "#9FB0C0",
      accent: "#29ABE2",
      accentText: "#0B1620",
      border: "rgba(41,171,226,0.40)",
      innerBorder: "rgba(255,255,255,0.10)",
      pattern: "rgba(41,171,226,0.20)",
      brand: "#F2F5F7",
      hukmBg: "rgba(41,171,226,0.16)",
      hukmText: "#7FD3F3",
      hukmBorder: "rgba(41,171,226,0.45)",
      quote: "rgba(41,171,226,0.18)",
      patternKind: "none",
    },
  },
  {
    // An editorial page: masthead with rules, justified serif body.
    id: "newspaper",
    nameKey: "ask.export.template.newspaper",
    descriptionKey: "ask.export.template.newspaper.desc",
    frame: "rule",
    header: "masthead",
    theme: {
      background: "linear-gradient(180deg, #F7F2E7 0%, #EFE7D6 100%)",
      glow:
        "radial-gradient(circle at 50% 0%, rgba(60,45,25,0.10), transparent 55%)",
      text: "#1B1710",
      muted: "#6A5D48",
      accent: "#8C1D18",
      accentText: "#FBF6EA",
      border: "rgba(28,23,16,0.55)",
      innerBorder: "rgba(28,23,16,0.22)",
      pattern: "rgba(28,23,16,0.10)",
      brand: "#1B1710",
      hukmBg: "rgba(140,29,24,0.10)",
      hukmText: "#8C1D18",
      hukmBorder: "rgba(140,29,24,0.40)",
      quote: "rgba(28,23,16,0.10)",
      patternKind: "none",
    },
  },
  {
    // A geometric tile with a thick leading bar and no frame.
    id: "mosaic",
    nameKey: "ask.export.template.mosaic",
    descriptionKey: "ask.export.template.mosaic.desc",
    frame: "bar",
    header: "plain",
    theme: {
      background: "linear-gradient(200deg, #0B3B3F 0%, #06262B 100%)",
      glow:
        "radial-gradient(circle at 85% 12%, rgba(94,234,212,0.16), transparent 46%)",
      text: "#EAFBF7",
      muted: "#93BDB8",
      accent: "#5EEAD4",
      accentText: "#04262B",
      border: "rgba(94,234,212,0.42)",
      innerBorder: "rgba(255,255,255,0.10)",
      pattern: "rgba(94,234,212,0.13)",
      brand: "#EAFBF7",
      hukmBg: "rgba(94,234,212,0.14)",
      hukmText: "#A7F3E6",
      hukmBorder: "rgba(94,234,212,0.45)",
      quote: "rgba(94,234,212,0.18)",
      patternKind: "tiles",
    },
  },
  {
    // A poster: huge quote mark, centred text, no frame, no pattern.
    id: "spotlight",
    nameKey: "ask.export.template.spotlight",
    descriptionKey: "ask.export.template.spotlight.desc",
    frame: "none",
    header: "plain",
    theme: {
      background:
        "radial-gradient(circle at 50% 0%, #1D2340 0%, #0B0F1E 62%, #070A14 100%)",
      glow:
        "radial-gradient(circle at 50% 18%, rgba(140,120,255,0.22), transparent 55%)",
      text: "#F4F2FF",
      muted: "#A6A2C4",
      accent: "#C9B8FF",
      accentText: "#141024",
      border: "rgba(201,184,255,0.34)",
      innerBorder: "rgba(255,255,255,0.08)",
      pattern: "rgba(201,184,255,0.20)",
      brand: "#F4F2FF",
      hukmBg: "rgba(201,184,255,0.14)",
      hukmText: "#D8CCFF",
      hukmBorder: "rgba(201,184,255,0.42)",
      quote: "rgba(201,184,255,0.22)",
      patternKind: "none",
    },
  },
];

export interface ShareSize {
  id: ShareSizeId;
  nameKey: string;
  /** CSS pixels the card is laid out at. */
  width: number;
  height: number;
  /** Multiplier applied on capture → the exported pixel size. */
  scale: number;
  /** `stack` = one column, `side` = two columns (landscape). */
  layout: "stack" | "side";
  padding: string;
  /** Characters kept in the matn. */
  textLimit: number;
  /** Height of the matn area in CSS pixels. */
  textArea: number;
}

export const SHARE_SIZES: ShareSize[] = [
  {
    id: "portrait",
    nameKey: "ask.export.size.portrait",
    width: 360,
    height: 450,
    scale: 3,
    layout: "stack",
    textLimit: 620,
    textArea: 238,
    padding: "26px 28px 22px",
  },
  {
    id: "square",
    nameKey: "ask.export.size.square",
    width: 360,
    height: 360,
    scale: 3,
    layout: "stack",
    textLimit: 400,
    textArea: 162,
    padding: "18px 24px 16px",
  },
  {
    id: "story",
    nameKey: "ask.export.size.story",
    width: 360,
    height: 640,
    scale: 3,
    layout: "stack",
    textLimit: 900,
    textArea: 404,
    padding: "32px 30px 28px",
  },
  {
    // 16:9-ish — a wide card for link previews, Telegram and X. The frame
    // drops to a single accent rule so the hadith gets the room.
    id: "landscape",
    nameKey: "ask.export.size.landscape",
    width: 480,
    height: 300,
    scale: 3,
    layout: "side",
    textLimit: 300,
    textArea: 150,
    padding: "22px 26px 20px",
  },
];

export function getShareTemplate(id: ShareTemplateId): ShareTemplate {
  return SHARE_TEMPLATES.find((template) => template.id === id) ?? SHARE_TEMPLATES[0];
}

export function getShareSize(id: ShareSizeId): ShareSize {
  return SHARE_SIZES.find((size) => size.id === id) ?? SHARE_SIZES[0];
}

/**
 * Star/dot/tile texture as an inline SVG data URI.
 *
 * A `<pattern>` element with a `url(#id)` fill does not survive the DOM
 * cloning `html-to-image` performs (the id reference breaks), while a data
 * URI background is copied verbatim and always rasterises.
 */
function patternBackground(
  color: string,
  kind: "stars" | "dots" | "tiles" | "none",
): string | undefined {
  if (kind === "none") return undefined;

  if (kind === "dots") {
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 46 46'>" +
      `<circle cx='9' cy='9' r='1.2' fill='${color}'/>` +
      `<circle cx='32' cy='32' r='0.8' fill='${color}' opacity='0.7'/>` +
      "</svg>";
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  if (kind === "tiles") {
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'>" +
      `<path d='M30 4 38 16 52 20 42 32 44 48 30 42 16 48 18 32 8 20 22 16Z' fill='none' stroke='${color}' stroke-width='1'/>` +
      `<path d='M0 30 8 24 16 30 8 36Z' fill='${color}' opacity='0.55'/>` +
      `<path d='M60 30 52 24 44 30 52 36Z' fill='${color}' opacity='0.35'/>` +
      "</svg>";
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='46' height='46' viewBox='0 0 46 46'>" +
    `<path d='M23 6.5 26.2 16l9.3 3.2-9.3 3.2L23 32l-3.2-9.6-9.3-3.2 9.3-3.2Z' fill='none' stroke='${color}' stroke-width='0.8'/>` +
    `<circle cx='23' cy='19.2' r='1.2' fill='${color}'/>` +
    "</svg>";
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function BrandMark({ color, accent }: { color: string; accent: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
      <path
        d="M16 2.5 20 12l9.5 4-9.5 4-4 9.5-4-9.5L2.5 16 12 12Z"
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M16 8.5 18 14l5.5 2-5.5 2-2 5.5-2-5.5L8.5 16l5.5-2Z"
        fill={accent}
        opacity="0.9"
      />
      <circle cx="16" cy="16" r="1.6" fill={color} />
    </svg>
  );
}

function CornerOrnament({
  color,
  position,
}: {
  color: string;
  position: "tl" | "tr" | "bl" | "br";
}) {
  const rotations = { tl: 0, tr: 90, br: 180, bl: 270 };
  const positions: Record<typeof position, CSSProperties> = {
    tl: { top: 9, left: 9 },
    tr: { top: 9, right: 9 },
    br: { bottom: 9, right: 9 },
    bl: { bottom: 9, left: 9 },
  };
  return (
    <svg
      aria-hidden
      width="24"
      height="24"
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        ...positions[position],
        transform: `rotate(${rotations[position]}deg)`,
        opacity: 0.85,
      }}
    >
      <path
        d="M2 22V7a5 5 0 0 1 5-5h15"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
      />
      <path
        d="M6 22V11a5 5 0 0 1 5-5h11"
        fill="none"
        stroke={color}
        strokeWidth="0.6"
        opacity="0.65"
      />
      <circle cx="6" cy="6" r="1.6" fill={color} opacity="0.85" />
    </svg>
  );
}

interface ShareImageProps {
  hadith: HadithResult;
  template: ShareTemplateId;
  size: ShareSizeId;
  className?: string;
}

/**
 * Fully self-contained share card. Rendered at a fixed CSS size and captured
 * at `scale`× so the exported PNG is sharp on social platforms.
 * Everything is inline style — no Tailwind colours — so html-to-image can
 * reproduce it exactly.
 */
export function ShareImage({
  hadith,
  template,
  size,
  className,
}: ShareImageProps) {
  const templateDef = getShareTemplate(template);
  const theme = templateDef.theme;
  const dims = getShareSize(size);
  const { text, truncated } = truncateAtWord(hadith.text, dims.textLimit);
  const chain = resolveSanad(hadith.sanad, hadith.text).names;
  const chainPreview =
    chain.length > 3
      ? `${chain.slice(0, 3).join(" ← ")} +${chain.length - 3}`
      : chain.join(" ← ");
  const citation = formatCitationShort(hadith);
  const hukm = [hadith.hukm, hadith.scholar].filter(Boolean).join(" — ");
  const topic = hadith.topic
    ? hadith.topic.length > 46
      ? `${hadith.topic.slice(0, 46)}…`
      : hadith.topic
    : "";
  const fontSize = pickFontSize(text.length, dims);
  const lineHeight = Math.round(fontSize * 1.9);
  const maxLines = Math.max(3, Math.floor(dims.textArea / lineHeight));
  const isSquare = size === "square";
  const isStory = size === "story";
  const isSide = dims.layout === "side";
  const pattern = patternBackground(theme.pattern, theme.patternKind);

  const body = (
    <>
      {/* Topic / kicker */}
      {topic ? (
        <p
          style={{
            margin: 0,
            maxWidth: isSide ? "100%" : "92%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: isSquare ? 7.2 : isSide ? 9 : 8,
            lineHeight: 1.4,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: theme.accent,
          }}
        >
          {topic}
        </p>
      ) : null}

      {/* Matn */}
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: 0,
          maxHeight: dims.textArea,
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: isSquare ? -14 : isSide ? -16 : -18,
            insetInlineStart: -3,
            fontSize: isSquare ? 34 : isSide ? 40 : 42,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
            color: theme.quote,
          }}
        >
          “
        </span>
        <p
          style={{
            position: "relative",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: maxLines,
            overflow: "hidden",
            margin: 0,
            fontSize,
            lineHeight: `${lineHeight}px`,
            fontWeight: 400,
            textAlign: text.length < 240 ? "center" : "justify",
            textJustify: "inter-word",
            color: theme.text,
            fontFamily: CSS_FONT_NASKH,
          }}
        >
          {text}
        </p>
      </div>

      {/* Sanad */}
      {chainPreview ? (
        <div
          style={{
            alignSelf: "center",
            maxWidth: "96%",
            borderRadius: 999,
            border: `1px solid ${theme.innerBorder}`,
            background:
              template === "minimal"
                ? "rgba(97,80,234,0.05)"
                : "rgba(255,255,255,0.035)",
            padding: isSquare ? "2px 8px" : "3px 10px",
            overflow: "hidden",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: isSquare ? 7.2 : isSide ? 8 : 8.2,
              lineHeight: 1.5,
              color: theme.muted,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
            }}
          >
            <span style={{ color: theme.accent, fontWeight: 700 }}>السند: </span>
            {chainPreview}
          </p>
        </div>
      ) : null}

      {/* Hukm */}
      {hukm ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            borderRadius: 999,
            border: `1px solid ${theme.hukmBorder}`,
            background: theme.hukmBg,
            color: theme.hukmText,
            padding: isSquare ? "3px 9px" : "4px 11px",
            fontSize: isSquare ? 8 : isSide ? 9 : 9,
            lineHeight: 1.4,
            fontWeight: 700,
            maxWidth: "94%",
          }}
        >
          <span style={{ opacity: 0.75 }}>الحكم:</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hukm}
          </span>
        </span>
      ) : (
        <div
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: theme.accent,
            opacity: 0.75,
            fontSize: 8,
          }}
        >
          <span>◆</span>
          <span>◆</span>
          <span>◆</span>
        </div>
      )}
    </>
  );

  return (
    <div
      dir="rtl"
      lang="ar"
      className={className}
      style={{
        position: "relative",
        width: dims.width,
        height: dims.height,
        overflow: "hidden",
        background: theme.background,
        color: theme.text,
        fontFamily: CSS_FONT_DISPLAY,
        isolation: "isolate",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: theme.glow,
          pointerEvents: "none",
        }}
      />
      {pattern ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: pattern,
            pointerEvents: "none",
          }}
        />
      ) : null}

      <Frame template={templateDef} isSide={isSide} isSquare={isSquare} />

      {isSide ? (
        /* ——— Landscape: a wide, frameless card ——— */
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: dims.padding,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BrandMark color={theme.brand} accent={theme.accent} />
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.25,
                    fontWeight: 700,
                    color: theme.brand,
                  }}
                >
                  دليل الأحكام
                </p>
                <p
                  style={{
                    margin: "1px 0 0",
                    fontSize: 7.5,
                    lineHeight: 1.3,
                    color: theme.muted,
                  }}
                >
                  أحاديث الأحكام بمصادرها
                </p>
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 999,
                border: `1px solid ${theme.innerBorder}`,
                padding: "2px 9px",
                fontSize: 8.5,
                fontWeight: 700,
                color: theme.muted,
                whiteSpace: "nowrap",
              }}
            >
              حديث #{hadith.hadithNumber}
            </span>
          </div>

          <div
            style={{
              marginTop: 10,
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 7,
            }}
          >
            {body}
          </div>

          <div
            style={{
              marginTop: 10,
              paddingTop: 9,
              borderTop: `1px solid ${theme.innerBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexShrink: 0,
              fontSize: 8,
              color: theme.muted,
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {citation}
              {truncated ? " · للنص الكامل راجع المصدر" : ""}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: theme.accent }}>✦</span>
              النص من قاعدة البيانات
            </span>
          </div>
        </div>
      ) : (
        /* ——— Stacked (portrait / square / story) ——— */
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: dims.padding,
          }}
        >
          <Head template={templateDef} hadithNumber={hadith.hadithNumber} />

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: isSquare ? 6 : isStory ? 13 : 9,
              paddingTop: isSquare ? 6 : 10,
              paddingBottom: isSquare ? 6 : 10,
            }}
          >
            {body}
          </div>

          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                height: 1,
                background: theme.innerBorder,
                marginBottom: isSquare ? 7 : 9,
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: isSquare ? 7.2 : 8.2,
                lineHeight: 1.65,
                color: theme.muted,
                textAlign: "center",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {citation}
              {truncated ? " · للنص الكامل راجع المصدر" : ""}
            </p>
            <div
              style={{
                marginTop: isSquare ? 5 : 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                fontSize: isSquare ? 7 : 7.8,
                color: theme.muted,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: theme.accent }}>✦</span>
                دليل الأحكام
              </span>
              <span style={{ opacity: 0.8 }}>النص من قاعدة البيانات</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The frame around the card — the main structural difference between designs. */
function Frame({
  template,
  isSide,
  isSquare,
}: {
  template: ShareTemplate;
  isSide: boolean;
  isSquare: boolean;
}) {
  const theme = template.theme;

  if (isSide) {
    // The landscape card is deliberately frameless — one accent rule at the
    // bottom edge is enough to carry the brand.
    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          insetInline: 0,
          bottom: 0,
          height: 5,
          background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentText})`,
          opacity: 0.9,
        }}
      />
    );
  }

  switch (template.frame) {
    case "double":
      return (
        <>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: isSquare ? 10 : 13,
              border: `1px solid ${theme.border}`,
              borderRadius: 5,
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: isSquare ? 15 : 19,
              border: `1px solid ${theme.innerBorder}`,
              borderRadius: 3,
            }}
          />
          <CornerOrnament color={theme.accent} position="tl" />
          <CornerOrnament color={theme.accent} position="tr" />
          <CornerOrnament color={theme.accent} position="bl" />
          <CornerOrnament color={theme.accent} position="br" />
        </>
      );

    case "hairline":
      return (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 14,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
          }}
        />
      );

    case "rule":
      return (
        <div
          aria-hidden
          style={{
            position: "absolute",
            insetInline: 0,
            bottom: 46,
            height: 1,
            background: theme.border,
          }}
        />
      );

    case "band":
      return (
        <div
          aria-hidden
          style={{
            position: "absolute",
            insetInline: 0,
            top: 0,
            height: 54,
            background: theme.hukmBg,
            borderBottom: `1px solid ${theme.hukmBorder}`,
          }}
        />
      );

    case "bar":
      return (
        <div
          aria-hidden
          style={{
            position: "absolute",
            insetInlineStart: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: theme.accent,
          }}
        />
      );

    default:
      return null;
  }
}

/** The card head — the other structural difference between designs. */
function Head({
  template,
  hadithNumber,
}: {
  template: ShareTemplate;
  hadithNumber: string;
}) {
  const theme = template.theme;

  if (template.header === "masthead") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          paddingTop: 2,
          paddingBottom: 8,
          borderBottom: `1px solid ${theme.border}`,
          boxShadow: `0 3px 0 -2px ${theme.border}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 19,
            lineHeight: 1.15,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: theme.brand,
          }}
        >
          DAILY AHKAM
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 8,
            lineHeight: 1.4,
            letterSpacing: "0.20em",
            color: theme.accent,
            textTransform: "uppercase",
          }}
        >
          أحاديث الأحكام بمصادرها
        </p>
      </div>
    );
  }

  if (template.header === "channel") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          height: 30,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: theme.accent,
              color: theme.accentText,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            د
          </span>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11.5,
                lineHeight: 1.25,
                fontWeight: 700,
                color: theme.brand,
              }}
            >
              دليل الأحكام
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 7,
                lineHeight: 1.3,
                color: theme.muted,
              }}
            >
              {hadithsCountLabel(hadithNumber)}
            </p>
          </div>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            background: theme.hukmBg,
            color: theme.hukmText,
            padding: "2px 8px",
            fontSize: 8,
            fontWeight: 700,
          }}
        >
          #{hadithNumber}
        </span>
      </div>
    );
  }

  if (template.header === "plain") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <BrandMark color={theme.brand} accent={theme.accent} />
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.3,
              fontWeight: 700,
              color: theme.brand,
            }}
          >
            دليل الأحكام
          </p>
        </div>
        <span
          style={{
            fontSize: 8,
            letterSpacing: "0.14em",
            color: theme.muted,
          }}
        >
          #{hadithNumber}
        </span>
      </div>
    );
  }

  // "brand" — the original manuscript brand block.
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BrandMark color={theme.brand} accent={theme.accent} />
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.3,
              fontWeight: 700,
              color: theme.brand,
            }}
          >
            دليل الأحكام
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 8,
              lineHeight: 1.4,
              color: theme.muted,
              letterSpacing: "0.02em",
            }}
          >
            أحاديث الأحكام بمصادرها
          </p>
        </div>
      </div>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          border: `1px solid ${theme.innerBorder}`,
          padding: "3px 9px",
          fontSize: 8.5,
          fontWeight: 700,
          color: theme.muted,
          whiteSpace: "nowrap",
        }}
      >
        حديث #{hadithNumber}
      </span>
    </div>
  );
}

function hadithsCountLabel(hadithNumber: string): string {
  return `حديث رقم ${hadithNumber}`;
}

function pickFontSize(length: number, dims: ShareSize): number {
  // The landscape card is much wider, so the same text needs a slightly
  // smaller relative size to keep the line length comfortable.
  const scale =
    dims.layout === "side"
      ? 0.92
      : dims.id === "square"
        ? 0.86
        : dims.id === "story"
          ? 1.02
          : 1;
  let base: number;
  if (length <= 150) base = 19.5;
  else if (length <= 250) base = 17.5;
  else if (length <= 370) base = 15.5;
  else if (length <= 500) base = 13.8;
  else if (length <= 650) base = 12.4;
  else if (length <= 800) base = 11.2;
  else base = 10.4;
  return Math.max(9, Math.round(base * scale * 10) / 10);
}
