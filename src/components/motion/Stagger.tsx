"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { childFade, pageStagger } from "@/lib/utils/motion";

// Wraps a region in the cinematic page-mount stagger. Direct children get
// the childFade variant. Use sparingly — only on first-paint layouts.
export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={pageStagger}
      initial="hidden"
      animate="shown"
      transition={{ delayChildren: delay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={childFade} className={className}>
      {children}
    </motion.div>
  );
}
