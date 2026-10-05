"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Select, Textarea, Input } from "@/components/ui/input";

function ReportFormInner() {
  const { locale } = useLocale();
  const params = useSearchParams();
  const preset = params.get("hadith") ?? "";
  const queryId = params.get("query") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const hadithId = String(form.get("hadith") ?? "").trim();
    const reason = String(form.get("type") ?? "inaccurate");
    const details = String(form.get("details") ?? "").trim();
    if (!hadithId || details.length < 10) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hadithId, reason, details, queryId: queryId || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Submit failed (${res.status}).`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        {done ? (
          <p className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200" role="status">
            {t(locale, "report.success")} — SRS §6.2
          </p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="hadith">Hadith ref</Label>
              <Input id="hadith" name="hadith" defaultValue={preset} placeholder="h1" />
            </div>
            <div>
              <Label htmlFor="type">{t(locale, "report.type")}</Label>
              <Select id="type" name="type" required defaultValue="inaccurate">
                <option value="inaccurate">inaccurate — SRS §6.2</option>
                <option value="text-error">text-error</option>
                <option value="citation-error">citation-error</option>
                <option value="other">other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="details">{t(locale, "report.details")}</Label>
              <Textarea id="details" name="details" required minLength={10} />
            </div>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={sending}>
              {sending ? "…" : t(locale, "report.submit")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportForm() {
  return (
    <Suspense>
      <ReportFormInner />
    </Suspense>
  );
}
