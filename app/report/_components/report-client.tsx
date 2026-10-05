"use client";

import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/common/page-header";
import { ReportForm } from "./report-form";

export function ReportClient() {
  const { locale } = useLocale();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader title={t(locale, "report.title")} subtitle="SRS §6.2 · FR-008" />
      <ReportForm />
    </div>
  );
}
