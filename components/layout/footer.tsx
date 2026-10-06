"use client";

import Image from "next/image";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const { locale } = useLocale();
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-medium text-foreground">
          {t(locale, "app.name")} — {t(locale, "app.tagline")}
        </p>
        <p>{t(locale, "hero.note")}</p>
      </div>
      <Separator />
      <p className="mx-auto w-full max-w-7xl px-4 py-3 text-xs text-muted-foreground sm:px-6">
        تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي · مؤسسة باذل الأهلية 2026م
      </p>
      {/* Official challenge banner: dark navy strip with the three white partner
          logos. DOM order is RTL — first item renders on the right (Bathel),
          matching the official banner: Bathel | AI Challenge | Year of AI. */}
      <div className="bg-[#00062c]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-4 sm:justify-between sm:px-6">
          <Image
            src="/hackton/logo-bathel-mask-BdkkH2w9.svg"
            alt="شعار مؤسسة باذل الأهلية"
            width={120}
            height={64}
            sizes="(max-width: 640px) 110px, 180px"
            className="h-7 w-auto brightness-0 invert sm:h-9 lg:h-10"
          />
          <Image
            src="/hackton/AI_CHALLENGE.svg"
            alt="شعار تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي"
            width={512}
            height={512}
            sizes="(max-width: 640px) 48px, 64px"
            className="h-9 w-auto sm:h-11 lg:h-12"
          />
          <Image
            src="/hackton/logo-year-of-ai-mask-DrmBdUph.svg"
            alt="شعار عام الذكاء الاصطناعي 2026"
            width={390}
            height={144}
            sizes="(max-width: 640px) 130px, 220px"
            className="h-7 w-auto brightness-0 invert sm:h-9 lg:h-10"
          />
        </div>
      </div>
    </footer>
  );
}
