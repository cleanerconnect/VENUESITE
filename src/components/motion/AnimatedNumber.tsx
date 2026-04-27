"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";

const defaultFormat = (n: number) =>
  Math.round(n).toLocaleString("fr-FR").replace(/,/g, " ");

// Animated count-up. Critical detail: the DOM node renders format(value)
// as initial text, so SSR, no-JS, and pre-hydration all show the real
// number. The animation overwrites it via textContent only once the ref
// is mounted AND the element is in view. Animating motion.span's transform
// would not help because textContent is what's read here.
export function AnimatedNumber({
  value,
  format = defaultFormat,
  duration = 1.2,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!ref.current || !inView) return;
    const node = ref.current;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(latest) {
        node.textContent = format(latest);
      },
    });
    return () => controls.stop();
  }, [value, inView, duration, format]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
