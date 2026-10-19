export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-surface-2">
        {/* 9Router mark, sourced from the 9Router project (MIT). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nine-router.svg" alt="" className="h-6 w-6" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold">
          9Router <span className="text-amber">Pulse</span>
        </span>
        <span className="mt-0.5 block text-[11px] uppercase tracking-[0.1em] text-ink-muted">
          Kontrol lalu lintas AI
        </span>
      </span>
    </div>
  );
}
