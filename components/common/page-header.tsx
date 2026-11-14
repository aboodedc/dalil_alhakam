import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow ? (
        <Badge variant="primary" className="w-fit">
          {eyebrow}
        </Badge>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
      {subtitle ? (
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
