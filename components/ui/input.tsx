import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

const fieldClasses =
  "flex w-full rounded-2xl border border-input bg-card/70 px-3.5 py-2 text-base shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-200 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm";

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(fieldClasses, "min-h-[44px]", className)}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldClasses, "min-h-[96px] leading-7", className)}
      {...props}
    />
  );
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldClasses, "min-h-[44px] cursor-pointer", className)}
      {...props}
    />
  );
}

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn("mb-1.5 block text-sm leading-6 font-medium text-foreground", className)}
      {...props}
    />
  );
}

export { Input, Textarea, Select, Label };
