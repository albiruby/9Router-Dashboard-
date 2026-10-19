"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLineUp, Gauge, ListMagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Ringkasan", icon: Gauge },
  { href: "/analytics", label: "Analitik", icon: ChartLineUp },
  { href: "/requests", label: "Request", icon: ListMagnifyingGlass },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="scrollbar-thin order-last w-full min-w-0 overflow-x-auto lg:order-none lg:ml-1 lg:w-auto"
    >
      <ul className="flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 text-[11px] font-medium transition-colors",
                  active
                    ? "bg-white/[0.07] text-ink"
                    : "text-ink-muted hover:bg-white/5 hover:text-ink"
                )}
              >
                <Icon size={14} weight={active ? "fill" : "regular"} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
