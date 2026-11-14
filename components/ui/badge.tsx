import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "border-border bg-card/60 text-foreground",
        primary: "border-primary/25 bg-primary/10 text-primary",
        accent:
          "border-white/40 bg-white/55 text-[#1d1d1f] dark:border-white/15 dark:bg-white/10 dark:text-white",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/35 bg-warning/10 text-warning",
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
