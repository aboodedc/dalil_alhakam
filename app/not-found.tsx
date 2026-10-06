import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">404 — Page not found</h1>
      <p className="text-sm text-muted-foreground">الصفحة غير موجودة</p>
      <Button asChild>
        <Link href="/">Home — الرئيسية</Link>
      </Button>
    </div>
  );
}
