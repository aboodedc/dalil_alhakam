import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex min-h-[44px] w-full rounded-xl border border-input bg-card px-3 py-2 text-base shadow-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        className
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-input bg-card px-3 py-2 text-base leading-7 shadow-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        className
      )}
      {...props}
    />
  );
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex min-h-[44px] w-full rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("mb-1.5 block text-sm leading-6 font-medium", className)}
      {...props}
    />
  );
}

export { Input, Textarea, Select, Label };
