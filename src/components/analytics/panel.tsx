import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, hint, action, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={cn("panel flex min-w-0 flex-col", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 md:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          {hint ? <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{hint}</p> : null}
        </div>
        {action ? <div className="ml-auto flex items-center gap-2">{action}</div> : null}
      </div>
      <div className={cn("min-w-0 flex-1 px-4 py-4 md:px-5", bodyClassName)}>{children}</div>
    </section>
  );
}
