"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

// Tiny inline sparkline with gold area + line + last-point dot.
export function Sparkline({
  data,
  width = 160,
  height = 48,
  stroke = "var(--color-gold)",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);
  const stepX = width / (data.length - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath =
    "M " + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");
  const lastX = points[points.length - 1][0];
  const firstX = points[0][0];
  const areaPath = `${linePath} L ${lastX.toFixed(1)},${height} L ${firstX.toFixed(1)},${height} Z`;
  const gradId = "sparkline-area";

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill={`url(#${gradId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: inView ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: inView ? 1 : 0 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx={lastX}
        cy={points[points.length - 1][1]}
        r={3}
        fill={stroke}
        initial={{ scale: 0 }}
        animate={{ scale: inView ? 1 : 0 }}
        transition={{ duration: 0.3, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
