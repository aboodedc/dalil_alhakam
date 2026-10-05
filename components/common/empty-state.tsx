export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
      <p className="font-medium text-stone-800 dark:text-stone-200">{title}</p>
      {hint ? <p className="text-sm text-stone-500 dark:text-stone-400">{hint}</p> : null}
    </div>
  );
}
