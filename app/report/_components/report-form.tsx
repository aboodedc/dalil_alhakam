"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReportFormFields } from "@/components/common/report-form-fields";
import { Card, CardContent } from "@/components/ui/card";

function ReportFormInner() {
  const params = useSearchParams();
  const hadithId = params.get("hadith") ?? "";
  const queryId = params.get("query") ?? "";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        <ReportFormFields
          hadithId={hadithId}
          queryId={queryId}
          // Opened from a result → the hadith reference is fixed.
          locked={Boolean(hadithId)}
        />
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
