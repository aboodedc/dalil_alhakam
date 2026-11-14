import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
          <p className="text-gradient-brand text-5xl font-semibold tracking-[-0.04em]">404</p>
          <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-sm text-muted-foreground">الصفحة غير موجودة</p>
          <Button asChild className="mt-2">
            <Link href="/">Home — الرئيسية</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
