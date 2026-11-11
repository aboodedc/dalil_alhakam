"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useLocale } from "@/components/common/language-provider";
import { t } from "@/lib/i18n/dictionaries";
import { ReportFormFields } from "@/components/common/report-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ReportDialogProps {
  hadithId: string;
  hadithLabel: string;
  queryId?: string | null;
}

/** Report action on an ask result — opens a modal; never leaves the chat. */
export function ReportDialog({ hadithId, hadithLabel, queryId }: ReportDialogProps) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-muted-foreground">
          <Flag className="h-4 w-4" />
          {t(locale, "ask.report")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(locale, "report.title")}</DialogTitle>
          <DialogDescription>{t(locale, "report.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ReportFormFields
            hadithId={hadithId}
            hadithLabel={hadithLabel}
            queryId={queryId}
            locked
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
