"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";
// The classes live in a module of their own, because this one is
// `"use client"` and a server component has to be able to read them —
// see `button-style.ts`.
import {
  BUTTON_BASE,
  SIZE,
  VARIANT,
  type Size,
  type Variant,
} from "./button-style";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

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
        BUTTON_BASE,
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
