import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">404 — Page not found</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">الصفحة غير موجودة</p>
      <Link href="/" className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white min-h-[44px] inline-flex items-center dark:bg-emerald-600 dark:text-emerald-950">
        Home — الرئيسية
      </Link>
    </div>
  );
}
