"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";

// Animates a numeric value in/out — used by the hero stats and KPI tiles.
// Plays a single time when the element scrolls into view, then jumps when
// the prop changes (e.g. real-time sale updates).
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("fr-FR").replace(/,/g, " "),
  duration = 1.0,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const previous = useRef(0);

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [inView, value, duration, format]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
