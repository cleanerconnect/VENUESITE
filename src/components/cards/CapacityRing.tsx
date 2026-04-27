"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

// Animated capacity ring — used inside the Tonight hero card.
// Stroke fills from 0 → percentage on first paint.
export function CapacityRing({
  value,
  max,
  size = 160,
  strokeWidth = 10,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#C9A64C"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: inView ? offset : circumference }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-eyebrow text-canvas/60">Couvert ce soir</div>
        <div
          className="text-canvas font-extrabold tabular-nums num"
          style={{ fontSize: size * 0.22, lineHeight: 1 }}
        >
          {Math.round(pct * 100)}%
        </div>
        <div className="text-meta text-canvas/55 mt-0.5 num">
          {value} / {max}
        </div>
      </div>
    </div>
  );
}
