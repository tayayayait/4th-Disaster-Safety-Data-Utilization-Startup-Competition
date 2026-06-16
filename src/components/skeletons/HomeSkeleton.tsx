export function HomeSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-label="홈 화면 로딩 중">
      <div className="min-h-[240px] animate-pulse bg-[var(--surface-alt)]" />
      <section
        className="bg-white p-5"
        style={{
          borderRadius: "16px 16px 0 0",
          boxShadow: "0 -8px 24px rgba(15,23,42,0.12)",
        }}
      >
        <div className="h-6 w-24 animate-pulse rounded bg-[var(--surface-alt)]" />
        <div className="mt-3 h-7 w-3/4 animate-pulse rounded bg-[var(--surface-alt)]" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-[var(--surface-alt)]" />
        <div className="mt-1 h-4 w-2/3 animate-pulse rounded bg-[var(--surface-alt)]" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="h-[52px] animate-pulse rounded-[10px] bg-[var(--surface-alt)]" />
          <div className="h-[52px] animate-pulse rounded-[10px] bg-[var(--surface-alt)]" />
        </div>
      </section>
    </div>
  );
}
