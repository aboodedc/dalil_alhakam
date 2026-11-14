"use client";

import type { ReactNode } from "react";
import type { HadithResult } from "@/types";
import { formatCitationShort } from "@/lib/utils";
import { resolveSanad } from "@/lib/sanad";
import { CSS_FONT_DISPLAY, CSS_FONT_NASKH } from "./fonts";
import { RichSummary } from "../rich-summary";

const PAPER = "#FBF7EE";
const INK = "#1E2A3A";
const GREEN = "#123C32";
const PURPLE = "#6150EA";
const GOLD = "#A9783F";
const MUTED = "#6C6659";
const LINE = "#D8CDB8";
const CREAM = "#F8F0E1";

/** A4 page size in CSS pixels (96 dpi × 210 × 297 mm). */
export const PDF_PAGE_WIDTH = 794;
export const PDF_PAGE_HEIGHT = 1123;

function PagePattern() {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='54' height='54' viewBox='0 0 54 54'>" +
    `<path d='M27 8 31 22l14 5-14 5-4 14-4-14-14-5 14-5Z' fill='none' stroke='${GOLD}' stroke-width='0.7' opacity='0.10'/>` +
    `<circle cx='27' cy='27' r='1.2' fill='${GOLD}' opacity='0.12'/>` +
    "</svg>";
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      }}
    />
  );
}

function PdfBrand({ dark = false }: { dark?: boolean }) {
  const color = dark ? "#F8F1DE" : GREEN;
  const accent = dark ? "#D8B56A" : GOLD;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden>
        <path
          d="M16 2.5 20 12l9.5 4-9.5 4-4 9.5-4-9.5L2.5 16 12 12Z"
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M16 8.5 18 14l5.5 2-5.5 2-2 5.5-2-5.5L8.5 16l5.5-2Z"
          fill={accent}
          opacity="0.9"
        />
      </svg>
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.2,
            fontWeight: 700,
            color,
          }}
        >
          دليل الأحكام
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 8.5,
            lineHeight: 1.4,
            color: dark ? "rgba(248,241,222,0.72)" : MUTED,
            letterSpacing: "0.04em",
          }}
        >
          أحاديث الأحكام بمصادرها
        </p>
      </div>
    </div>
  );
}

function PageFrame({
  children,
  pageNumber,
  totalPages,
  tone = "paper",
}: {
  children: ReactNode;
  pageNumber: number;
  totalPages: number;
  tone?: "paper" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        position: "relative",
        width: PDF_PAGE_WIDTH,
        height: PDF_PAGE_HEIGHT,
        overflow: "hidden",
        background: dark
          ? "linear-gradient(160deg,#0F1533 0%,#182253 55%,#0B302D 100%)"
          : PAPER,
        color: dark ? "#F7F4FF" : INK,
        fontFamily: CSS_FONT_DISPLAY,
      }}
    >
      <PagePattern />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 24,
          border: `1px solid ${dark ? "rgba(216,181,106,0.34)" : "rgba(169,120,63,0.28)"}`,
          borderRadius: 4,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 31,
          border: `1px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(169,120,63,0.13)"}`,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "44px 52px 34px",
        }}
      >
        {children}
        <div
          style={{
            // The cover's middle block already takes the free space, so the
            // footer only needs a fixed gap here.
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${dark ? "rgba(216,181,106,0.24)" : LINE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 8.5,
            color: dark ? "rgba(247,244,255,0.62)" : MUTED,
          }}
        >
          <span>النصوص من قاعدة البيانات — دليل الأحكام</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 54,
              borderRadius: 999,
              border: `1px solid ${dark ? "rgba(216,181,106,0.34)" : LINE}`,
              padding: "2px 8px",
              fontWeight: 700,
              // Keep "1 / 4" in that order — an RTL paragraph would flip it.
              direction: "ltr",
            }}
          >
            {pageNumber} / {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
}

export interface PdfSummaryProps {
  /** The LLM answer (Markdown). */
  answer: string;
  question?: string;
  pageNumber: number;
  totalPages: number;
}

/**
 * The "خلاصة البحث" page — the same rich renderer the chat uses, so the PDF
 * shows exactly what the user read on screen.
 */
export function PdfSummaryPage({
  answer,
  question,
  pageNumber,
  totalPages,
}: PdfSummaryProps) {
  return (
    <PageFrame pageNumber={pageNumber} totalPages={totalPages}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingBottom: 14,
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <PdfBrand />
        <div style={{ textAlign: "end" }}>
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: GOLD,
            }}
          >
            خلاصة البحث
          </p>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 13,
              fontWeight: 700,
              color: GREEN,
            }}
          >
            إجابة مُولَّدة بالذكاء الاصطناعي
          </p>
        </div>
      </div>

      {question?.trim() ? (
        <div
          style={{
            marginTop: 16,
            borderRadius: 12,
            border: `1px solid ${LINE}`,
            background: CREAM,
            padding: "12px 16px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: PURPLE,
            }}
          >
            سؤال البحث
          </p>
          <p
            style={{
              margin: "5px 0 0",
              fontSize: 13,
              lineHeight: 1.9,
              color: INK,
            }}
          >
            {question.trim()}
          </p>
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <RichSummary text={answer} variant="print" />
      </div>
    </PageFrame>
  );
}

export interface PdfCoverProps {
  title?: string;
  question?: string;
  count: number;
  date: string;
  books: string[];
  pageNumber: number;
  totalPages: number;
  /** True when a sanad/hukm came from the AI estimate — changes the note. */
  aiEstimated?: boolean;
}

export function PdfCoverPage({
  title,
  question,
  count,
  date,
  books,
  pageNumber,
  totalPages,
  aiEstimated = false,
}: PdfCoverProps) {
  return (
    <PageFrame pageNumber={pageNumber} totalPages={totalPages} tone="dark">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <PdfBrand dark />
        <span
          style={{
            borderRadius: 999,
            border: "1px solid rgba(216,181,106,0.42)",
            background: "rgba(216,181,106,0.10)",
            color: "#E8D2A2",
            padding: "5px 12px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          ملف نتائج البحث
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          gap: 22,
          padding: "40px 28px 30px",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 68,
            height: 68,
            borderRadius: 20,
            border: "1px solid rgba(216,181,106,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#D8B56A",
            fontSize: 30,
            background: "rgba(216,181,106,0.08)",
          }}
        >
          ✦
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "#D8B56A",
            }}
          >
            Dalil Al-Ahkam
          </p>
          <h1
            style={{
              margin: "10px 0 0",
              fontFamily: CSS_FONT_DISPLAY,
              fontSize: 34,
              lineHeight: 1.35,
              fontWeight: 700,
              color: "#F8F1DE",
            }}
          >
            {title?.trim() || "نتائج البحث في أحاديث الأحكام"}
          </h1>
          <p
            style={{
              margin: "10px auto 0",
              maxWidth: 500,
              fontSize: 12,
              lineHeight: 1.9,
              color: "rgba(248,241,222,0.72)",
            }}
          >
            مقتطفات مسترجعة من المصادر المحققة، مع السند والحكم والمصدر لكل حديث.
          </p>
        </div>

        {question?.trim() ? (
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: 14,
              border: "1px solid rgba(46,242,194,0.24)",
              background: "rgba(255,255,255,0.045)",
              padding: "14px 18px",
              textAlign: "start",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#2EF2C2",
              }}
            >
              سؤال البحث
            </p>
            <p
              style={{
                margin: "5px 0 0",
                fontSize: 13,
                lineHeight: 1.9,
                color: "#F7F4FF",
              }}
            >
              {question.trim()}
            </p>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontSize: 9.5,
            color: "rgba(248,241,222,0.76)",
          }}
        >
          <span
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.16)",
              padding: "5px 12px",
            }}
          >
            {count} حديثاً
          </span>
          <span
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.16)",
              padding: "5px 12px",
            }}
          >
            {date}
          </span>
          {books.slice(0, 2).map((book) => (
            <span
              key={book}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                padding: "5px 12px",
                maxWidth: 250,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {book}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          borderRadius: 10,
          border: "1px solid rgba(216,181,106,0.22)",
          background: "rgba(216,181,106,0.06)",
          padding: "10px 14px",
          fontSize: 8.5,
          lineHeight: 1.8,
          color: "rgba(248,241,222,0.64)",
          textAlign: "center",
        }}
      >
        تنبيه: النصوص منقولة حرفياً من قاعدة البيانات.{" "}
        {aiEstimated
          ? "السند أو الحكم غير المتوفر في القاعدة تقدير آلي — وليس حكماً شرعياً؛ راجع المصدر وعالم مختص."
          : "السند المعروض مستخرج من المتن للعرض فقط، وليس حكماً على صحة الحديث."}
      </div>
    </PageFrame>
  );
}

/**
 * The sanad as a node-link graph.
 *
 * The chain descends from the Prophet ﷺ root down a central spine; every
 * narrator hangs off the spine in an alternating card, so the isnad reads as
 * a tree rather than a row of pills. The panel also states where the chain
 * came from — the same transparency the app shows.
 */
function SanadGraph({
  names,
  hasProphet,
  sourceLabel,
}: {
  names: string[];
  hasProphet: boolean;
  sourceLabel: string;
}) {
  const MAX_NODES = 6;
  const visible = names.slice(0, MAX_NODES);
  const hidden = names.length - visible.length;
  const countLabel =
    names.length === 1
      ? "راوٍ واحد"
      : names.length === 2
        ? "راويان"
        : `${names.length} رواة`;

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 14,
        border: `1px solid ${LINE}`,
        background: "linear-gradient(180deg, #FDFAF3 0%, #F8F2E5 100%)",
        padding: "10px 14px 11px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 9,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: PURPLE,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
            <circle
              cx="7"
              cy="2.6"
              r="1.5"
              fill="none"
              stroke={PURPLE}
              strokeWidth="1.1"
            />
            <circle
              cx="2.6"
              cy="11"
              r="1.5"
              fill="none"
              stroke={PURPLE}
              strokeWidth="1.1"
            />
            <circle
              cx="11.4"
              cy="11"
              r="1.5"
              fill="none"
              stroke={PURPLE}
              strokeWidth="1.1"
            />
            <path
              d="M7 4.1v2.6M7 6.7H2.6v2.8M7 6.7h4.4v2.8"
              fill="none"
              stroke={PURPLE}
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
          شجرة السند
        </span>
        <span style={{ fontSize: 8, color: MUTED }}>
          {countLabel} · {sourceLabel}
        </span>
      </div>

      {hasProphet ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                borderRadius: 12,
                border: `1px solid ${GOLD}`,
                background: "#FBF1DC",
                padding: "4px 13px",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                <path
                  d="M6 0.8 7.5 4.5 11.2 6 7.5 7.5 6 11.2 4.5 7.5 0.8 6 4.5 4.5Z"
                  fill={GOLD}
                />
              </svg>
              <span
                style={{
                  fontFamily: CSS_FONT_NASKH,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: GREEN,
                }}
              >
                النبي محمد ﷺ
              </span>
              <span style={{ fontSize: 8, color: MUTED }}>أصل السند</span>
            </span>
          </div>
          <div
            aria-hidden
            style={{ width: 1, height: 12, margin: "0 auto", background: LINE }}
          />
        </>
      ) : null}

      <div style={{ position: "relative" }}>
        {visible.length > 0 ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: 1,
              background: LINE,
            }}
          />
        ) : null}

        {visible.map((name, index) => {
          const onRight = index % 2 === 0;
          const isLast = index === visible.length - 1 && hidden === 0;
          return (
            <div
              key={`${name}-${index}`}
              style={{
                position: "relative",
                marginTop: index === 0 ? 0 : 7,
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: "50%",
                  height: 1,
                  width: 14,
                  background: LINE,
                  ...(onRight ? { left: "50%" } : { right: "50%" }),
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  border: `1px solid ${isLast ? GREEN : LINE}`,
                  background: isLast ? GREEN : "#F8F2E5",
                  color: isLast ? "#F8F1DE" : MUTED,
                  fontSize: 7.5,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {index + 1}
              </span>
              <div
                style={{
                  width: 290,
                  maxWidth: "calc(50% - 14px)",
                  boxSizing: "border-box",
                  ...(onRight
                    ? { marginLeft: "calc(50% + 14px)" }
                    : { marginRight: "calc(50% + 14px)" }),
                  borderRadius: 9,
                  border: `1px solid ${isLast ? "rgba(18,60,50,0.42)" : LINE}`,
                  background: isLast ? "#F6FAF5" : "#FFFFFF",
                  boxShadow: "0 1px 2px rgba(30,42,58,0.05)",
                  padding: "4px 10px",
                  minHeight: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: CSS_FONT_NASKH,
                    fontSize: 10.5,
                    lineHeight: 1.6,
                    color: INK,
                    textAlign: "center",
                  }}
                >
                  {name}
                </span>
                {isLast ? (
                  <span
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(18,60,50,0.25)",
                      padding: "1px 5px",
                      fontSize: 7,
                      fontWeight: 700,
                      color: GREEN,
                      whiteSpace: "nowrap",
                    }}
                  >
                    آخر السند
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}

        {hidden > 0 ? (
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              marginTop: 8,
              zIndex: 1,
            }}
          >
            <span
              style={{
                borderRadius: 999,
                border: `1px dashed ${LINE}`,
                background: PAPER,
                padding: "3px 10px",
                fontSize: 8,
                color: MUTED,
              }}
            >
              +{hidden} رواة
            </span>
          </div>
        ) : null}
      </div>

      {visible.length > 0 ? (
        <>
          <div
            aria-hidden
            style={{ width: 1, height: 7, margin: "0 auto", background: LINE }}
          />
          <div aria-hidden style={{ display: "flex", justifyContent: "center" }}>
            <span
              style={{
                width: 5,
                height: 5,
                background: GOLD,
                transform: "rotate(45deg)",
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

export interface PdfHadithProps {
  hadith: HadithResult;
  chunk: string;
  part: number;
  parts: number;
  pageNumber: number;
  totalPages: number;
}

export function PdfHadithPage({
  hadith,
  chunk,
  part,
  parts,
  pageNumber,
  totalPages,
}: PdfHadithProps) {
  const resolved = resolveSanad(hadith.sanad, hadith.text);
  const chain = resolved.names;
  const hasProphet = resolved.hasProphet;
  const sanadSourceLabel =
    resolved.source === "database"
      ? "من قاعدة البيانات"
      : resolved.source === "ai"
        ? "تقدير آلي — ليس حكماً شرعياً"
        : "مستخرج من نص الحديث";
  const hukm = [hadith.hukm, hadith.scholar].filter(Boolean).join(" — ");
  const citation = formatCitationShort(hadith);
  const showMeta = part === 0;
  const isContinuation = part > 0;
  const fontSize =
    chunk.length > 1150 ? 14.5 : chunk.length > 800 ? 15.5 : chunk.length > 420 ? 16.5 : 18;

  return (
    <PageFrame pageNumber={pageNumber} totalPages={totalPages}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingBottom: 14,
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <PdfBrand />
        <div style={{ textAlign: "end" }}>
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: GOLD,
            }}
          >
            {isContinuation ? `تكملة المتن (${part + 1}/${parts})` : "بطاقة حديث"}
          </p>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 13,
              fontWeight: 700,
              color: GREEN,
            }}
          >
            حديث #{hadith.hadithNumber}
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          fontSize: 9,
          color: MUTED,
        }}
      >
        <span
          style={{
            borderRadius: 999,
            border: `1px solid ${LINE}`,
            background: "#F4ECDD",
            padding: "4px 10px",
            color: GREEN,
            fontWeight: 700,
          }}
        >
          {hadith.bookTitle}
        </span>
        {hadith.topic ? (
          <span
            style={{
              maxWidth: 380,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              borderRadius: 999,
              border: `1px solid ${LINE}`,
              padding: "4px 10px",
            }}
          >
            {hadith.topic}
          </span>
        ) : null}
        <span style={{ marginInlineStart: "auto" }}>
          ج{hadith.volume} · ص{hadith.page}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 16,
          minHeight: 0,
          borderRadius: 16,
          border: `1px solid ${LINE}`,
          background: "#FFFDF8",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 4,
            insetInlineStart: 16,
            fontFamily: "Georgia, serif",
            fontSize: 64,
            lineHeight: 1,
            color: "rgba(169,120,63,0.12)",
          }}
        >
          “
        </span>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            insetInlineStart: 0,
            width: 4,
            height: "100%",
            background: `linear-gradient(180deg, ${GREEN}, ${PURPLE})`,
            opacity: 0.75,
          }}
        />
        <p
          style={{
            position: "relative",
            margin: 0,
            fontSize,
            lineHeight: 1.95,
            textAlign: "justify",
            textJustify: "inter-word",
            color: INK,
            fontFamily: CSS_FONT_NASKH,
          }}
        >
          {chunk}
        </p>
      </div>

      {showMeta ? (
        <>
          {chain.length > 0 ? (
            <SanadGraph
              names={chain}
              hasProphet={hasProphet}
              sourceLabel={sanadSourceLabel}
            />
          ) : null}

          {hukm ? (
            <div
              style={{
                marginTop: 13,
                display: "flex",
                alignItems: "center",
                gap: 9,
                borderRadius: 10,
                border: "1px solid rgba(169,120,63,0.32)",
                background: "#F8F0E1",
                padding: "8px 12px",
              }}
            >
              <span
                style={{
                  borderRadius: 999,
                  background: GREEN,
                  color: "#F8F1DE",
                  padding: "3px 9px",
                  fontSize: 8.5,
                  fontWeight: 700,
                }}
              >
                الحكم
              </span>
              <span style={{ fontSize: 10.5, color: INK, fontWeight: 700 }}>
                {hukm}
              </span>
              <span
                style={{
                  marginInlineStart: "auto",
                  fontSize: 8,
                  color: MUTED,
                }}
              >
                حسب المصدر
              </span>
            </div>
          ) : null}
        </>
      ) : null}

      <div style={{ marginTop: "auto", paddingTop: 13 }}>
        <p
          style={{
            margin: 0,
            fontSize: 9,
            lineHeight: 1.8,
            color: MUTED,
            textAlign: "center",
          }}
        >
          {citation}
        </p>
      </div>
    </PageFrame>
  );
}
