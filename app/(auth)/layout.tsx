export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute start-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0071e3]/10 blur-3xl dark:bg-[#0a84ff]/20" />
        <div className="absolute bottom-0 end-[18%] h-64 w-64 rounded-full bg-[#bf5af2]/10 blur-3xl dark:bg-[#bf5af2]/15" />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
