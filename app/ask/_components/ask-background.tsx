/**
 * Decorative background for the Ask page: soft Apple-style product glows.
 * Purely presentational — `aria-hidden`, no interactivity, server-rendered,
 * so it cannot cause hydration mismatches.
 */
export function AskBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-24 start-[15%] h-72 w-72 rounded-full bg-[#0071e3]/10 blur-3xl dark:bg-[#0a84ff]/20" />
      <div className="absolute top-1/3 -start-24 h-80 w-80 rounded-full bg-[#00c7be]/10 blur-3xl dark:bg-[#00c7be]/15" />
      <div className="absolute -bottom-16 end-[10%] h-72 w-72 rounded-full bg-[#bf5af2]/10 blur-3xl dark:bg-[#bf5af2]/15" />
    </div>
  );
}
