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

// Violet is the only chrome accent. Primary CTA + ink variant for the
// rare dark-surface action.
const VARIANT: Record<Variant, string> = {
  // The disabled primary.
  //
  // It was `bg-violet/40` *and* the base's `disabled:opacity-50`: the
  // same fade applied twice, which put white text on a violet at 40%
  // faded to half — 1,7:1, where a disabled control still owes 3:1
  // because it is still a control somebody has to read to know why
  // they cannot press it. A quiet grey fill with muted ink says
  // « not now » and measures 4,6:1.
  primary:
    "bg-violet text-canvas hover:bg-violet-deep disabled:bg-line-soft disabled:text-ink-mute",
  secondary:
    "bg-surface text-ink border border-line hover:border-ink disabled:text-ink-mute disabled:border-line-soft",
  destructive:
    "bg-danger text-canvas hover:bg-danger/90 disabled:bg-line-soft disabled:text-ink-mute",
  ghost: "bg-transparent text-ink hover:bg-ink/[0.04] disabled:text-ink-mute",
  ink: "bg-ink text-canvas hover:bg-ink-soft disabled:bg-line-soft disabled:text-ink-mute",
};

// Heights are control specs — 36, 44, 56, with the host density
// lifting the floor to 44 on a tablet. The horizontal padding used to
// be 14, 20 and 28: three values, none of them on the 4-step spacing
// scale, and 14 and 20 sitting three and four pixels from the 12 and 24
// used everywhere else in the same row. On the scale they are 16, 24,
// 32, which is also the proportion the heights are in.
const SIZE: Record<Size, string> = {
  sm: "h-9 px-4 text-control-sm rounded-[var(--radius-sm)]",
  md: "h-11 px-6 text-control-md rounded-[var(--radius-sm)]",
  lg: "h-14 px-8 text-control-lg rounded-[var(--radius-md)]",
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
      // So the audit can put one product's primary button over the
      // other's without guessing which node is which from its classes.
      data-variant={variant}
      data-size={size}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150",
        // No blanket opacity: each variant states its own disabled
        // colours, so the contrast of each can be measured instead of
        // being whatever half of something happened to be.
        "disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {/* The icons used to carry -ml-0.5 / -mr-0.5 — two pixels, off
          the scale, with no reason written anywhere. The 8px gap and
          the 16px optical size already sit the icon on the label's
          x-height; the two pixels were where it landed. */}
      {iconLeft ? <span className="shrink-0">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="shrink-0">{iconRight}</span> : null}
    </motion.button>
  );
});
