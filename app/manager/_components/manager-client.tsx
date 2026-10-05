"use client";

import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/common/page-header";
import { BooksTable } from "./books-table";

export function ManagerClient() {
  const { locale } = useLocale();
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader title={t(locale, "manager.title")} subtitle={`${t(locale, "manager.subtitle")} — SRS §2.3 · FR-002`} />
      <BooksTable />
    </div>
  );
}
