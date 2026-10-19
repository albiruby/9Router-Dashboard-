"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

interface ProviderIconProps {
  name: string;
  icon: string | null;
  color: string;
  size?: number;
  className?: string;
}

export function ProviderIcon({ name, icon, color, size = 36, className }: ProviderIconProps) {
  const [failed, setFailed] = useState(false);
  const inner = Math.round(size * 0.56);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-white/5",
        className
      )}
      style={{ width: size, height: size, backgroundColor: `${color}1a` }}
      aria-hidden="true"
    >
      {icon && !failed ? (
        // Provider logos are local assets from the 9Router project (MIT).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon}
          alt=""
          width={inner}
          height={inner}
          className="object-contain"
          style={{ width: inner, height: inner }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-mono text-[10px] font-semibold" style={{ color }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}
