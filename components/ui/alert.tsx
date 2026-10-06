import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex items-start gap-2.5 rounded-2xl border p-4 text-sm leading-7", {
  variants: {
    variant: {
      default: "border-border bg-muted text-foreground",
      info: "border-[#6150EA]/30 bg-[#6150EA]/10 text-foreground",
      success: "border-emerald-500/30 bg-emerald-500/10 text-foreground",
      warning: "border-amber-500/30 bg-amber-500/10 text-foreground",
      destructive: "border-destructive/30 bg-destructive/10 text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className={cn("font-semibold", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("break-words text-muted-foreground", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
