import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-foreground",
        primary: "border-primary/30 bg-primary/10 text-primary dark:text-primary",
        accent: "border-[#2EF2C2]/40 bg-[#2EF2C2]/15 text-[#052e26] dark:text-[#2EF2C2]",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
