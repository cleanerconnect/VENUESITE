"use client";

import { motion } from "motion/react";
import { ease } from "@/lib/utils/motion";
import { cn } from "@/lib/utils/cn";

// There used to be a "gold" tone here that painted violet — an alias kept
// for a migration that had already finished, so two names produced one
// bar. Callers now say "violet", and a tone maps to exactly one fill.
type Tone = "violet" | "ink" | "success";
type Size = "xs" | "sm" | "md";

const FILL: Record<Tone, string> = {
  violet: "bg-violet",
  ink: "bg-ink",
  success: "bg-success",
};

const HEIGHT: Record<Size, string> = {
  xs: "h-[2px]",
  sm: "h-1",
  md: "h-1.5",
};

export function ProgressBar({
  value,
  max,
  tone = "violet",
  size = "xs",
  trackClassName,
}: {
  value: number;
  max: number;
  tone?: Tone;
  size?: Size;
  trackClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-line",
        HEIGHT[size],
        trackClassName,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <motion.div
        className={cn("h-full rounded-full", FILL[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease }}
      />
    </div>
  );
}
