interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">{title}</h1>
      {subtitle ? <p className="text-sm leading-6 text-stone-600 sm:text-base dark:text-stone-400">{subtitle}</p> : null}
    </div>
  );
}
