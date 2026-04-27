"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "destructive" | "ghost" | "ink";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

// Gold is our only accent — primary CTA only. Ink variant for dark surfaces.
const VARIANT: Record<Variant, string> = {
  primary:
    "bg-gold text-ink hover:bg-gold-deep hover:text-canvas disabled:bg-gold/40",
  secondary: "bg-surface text-ink border border-line hover:border-ink",
  destructive: "bg-danger text-canvas hover:bg-danger/90",
  ghost: "bg-transparent text-ink hover:bg-ink/[0.04]",
  ink: "bg-ink text-canvas hover:bg-ink-soft",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-[var(--radius-sm)]",
  md: "h-11 px-5 text-[14px] rounded-[var(--radius-sm)]",
  lg: "h-14 px-7 text-[15px] rounded-[var(--radius-md)]",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      transition={{ duration: 0.12 }}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {iconLeft ? <span className="shrink-0 -ml-0.5">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="shrink-0 -mr-0.5">{iconRight}</span> : null}
    </motion.button>
  );
});
