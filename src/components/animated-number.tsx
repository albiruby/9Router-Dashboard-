"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
  title?: string;
}

const TWEEN_MS = 560;
const FLASH_MS = 720;
const UP_GLOW = "246, 183, 60";
const DOWN_GLOW = "255, 107, 107";

export function AnimatedNumber({ value, format, className, title }: AnimatedNumberProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const frameRef = useRef<number | null>(null);
  const nodeRef = useRef<HTMLSpanElement>(null);
  const previousRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return;

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;

    if (reducedMotion) {
      displayRef.current = to;
      frameRef.current = requestAnimationFrame(() => setDisplay(to));
      return;
    }

    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / TWEEN_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = to;
        setDisplay(to);
        frameRef.current = null;
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, reducedMotion]);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = value;
    if (previous === value || !nodeRef.current || reducedMotion) return;

    const glow = value > previous ? UP_GLOW : DOWN_GLOW;
    nodeRef.current.animate(
      [
        { textShadow: `0 0 16px rgba(${glow}, 0.6)` },
        { textShadow: "0 0 0px rgba(0, 0, 0, 0)" },
      ],
      { duration: FLASH_MS, easing: "ease-out" }
    );
  }, [value, reducedMotion]);

  return (
    <span ref={nodeRef} className={className} title={title}>
      {format(display)}
    </span>
  );
}
