"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea, Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authFetch } from "@/lib/auth-client";

export interface ReportFormFieldsProps {
  /** Hadith id (from the ask result) or empty for a manual report page entry. */
  hadithId?: string;
  /** Display label such as "#112 · صحيح البخاري" (used when locked). */
  hadithLabel?: string;
  queryId?: string | null;
  /** True when the report was opened from a result: the ref cannot be edited. */
  locked?: boolean;
  onSuccess?: (reportId: string | null) => void;
}

/** Shared report form used by /report and by the ask-page report dialog. */
export function ReportFormFields({
  hadithId = "",
  hadithLabel,
  queryId,
  locked = false,
  onSuccess,
}: ReportFormFieldsProps) {
  const { locale } = useLocale();
  const [done, setDone] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const reasons = [
    { value: "inaccurate", label: t(locale, "report.reason.inaccurate") },
    { value: "text-error", label: t(locale, "report.reason.text-error") },
    { value: "citation-error", label: t(locale, "report.reason.citation-error") },
    { value: "other", label: t(locale, "report.reason.other") },
  ];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const id = locked ? hadithId : String(form.get("hadith") ?? "").trim();
    const reason = String(form.get("type") ?? "inaccurate");
    const details = String(form.get("details") ?? "").trim();
    if (!id || details.length < 10) {
      setError(t(locale, "report.required"));
      return;
    }

    setSending(true);
    setError(null);
    try {
      // Make Report sequence endpoint name: POST /api/report
      const res = await authFetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hadithId: id, reason, details, queryId: queryId || null }),
      });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: { reportId?: string }; error?: string }
        | null;

      if (!res.ok) {
        setError(
          res.status === 404
            ? t(locale, "report.notFound")
            : (json?.error ?? t(locale, "report.error")),
        );
        return;
      }

      const idFromServer = json?.data?.reportId ?? null;
      setReportId(idFromServer);
      setDone(true);
      onSuccess?.(idFromServer);
    } catch {
      setError(t(locale, "report.error"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <Alert variant="success" role="status">
        <AlertDescription>
          {t(locale, "report.success")}
          {reportId ? (
            <span className="mt-1 block text-xs opacity-80">
              {t(locale, "report.id")}: {reportId}
            </span>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div>
        <Label htmlFor="report-hadith">{t(locale, "report.reference")}</Label>
        {locked ? (
          <>
            <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm">
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 break-all font-medium">{hadithLabel || hadithId}</span>
            </div>
            <input type="hidden" name="hadith" value={hadithId} />
            <p className="mt-1 text-xs text-muted-foreground">{t(locale, "report.referenceLocked")}</p>
          </>
        ) : (
          <Input
            id="report-hadith"
            name="hadith"
            defaultValue={hadithId}
            placeholder={t(locale, "report.referencePlaceholder")}
            required
          />
        )}
      </div>

      <div>
        <Label htmlFor="report-type">{t(locale, "report.type")}</Label>
        <Select id="report-type" name="type" required defaultValue="inaccurate">
          {reasons.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="report-details">{t(locale, "report.details")}</Label>
        <Textarea
          id="report-details"
          name="details"
          required
          minLength={10}
          placeholder={t(locale, "report.detailsPlaceholder")}
        />
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={sending}>
        {sending ? "…" : t(locale, "report.submit")}
      </Button>
    </form>
  );
}
