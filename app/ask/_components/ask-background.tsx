/**
 * Decorative background for the Ask page: soft brand glows.
 * Purely presentational — `aria-hidden`, no interactivity, server-rendered,
 * so it cannot cause hydration mismatches.
 */
export function AskBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Glow blobs — faint brand washes, slightly stronger in dark mode */}
      <div className="absolute -top-24 start-[15%] h-72 w-72 rounded-full bg-[#6150EA]/15 blur-3xl dark:bg-[#6150EA]/25" />
      <div className="absolute top-1/3 -start-24 h-80 w-80 rounded-full bg-[#2EF2C2]/10 blur-3xl dark:bg-[#2EF2C2]/15" />
      <div className="absolute -bottom-16 end-[10%] h-72 w-72 rounded-full bg-[#6150EA]/10 blur-3xl dark:bg-[#2EF2C2]/10" />
    </div>
  );
}
