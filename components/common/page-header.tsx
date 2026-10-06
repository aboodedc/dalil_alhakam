import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow ? (
        <Badge variant="primary" className="w-fit">
          {eyebrow}
        </Badge>
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle ? <p className="text-sm leading-6 text-muted-foreground sm:text-base">{subtitle}</p> : null}
    </div>
  );
}
