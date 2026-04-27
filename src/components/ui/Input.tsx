"use client";

import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils/cn";

// Floating-label input, label animates up on focus / when the field has
// content. 48px tall, white surface, gold focus ring.
interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, prefix, suffix, className, value, defaultValue, ...rest },
  ref,
) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const hasValue = Boolean(
    (value ?? defaultValue ?? "").toString().length > 0,
  );
  const floated = focused || hasValue;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "relative flex items-center bg-surface border rounded-[var(--radius-sm)]",
          "transition-colors duration-150",
          error
            ? "border-danger/60"
            : focused
              ? "border-ink"
              : "border-line",
        )}
      >
        {prefix ? (
          <span className="pl-3.5 text-ink-mute">{prefix}</span>
        ) : null}
        <div className="relative flex-1">
          <motion.label
            htmlFor={id}
            initial={false}
            animate={{
              y: floated ? -10 : 0,
              scale: floated ? 0.84 : 1,
              color: error
                ? "var(--color-danger)"
                : floated
                  ? "var(--color-ink)"
                  : "var(--color-ink-mute)",
            }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute left-3.5 top-1/2 -translate-y-1/2 origin-top-left",
              "pointer-events-none font-medium text-[14px]",
              floated && "font-semibold",
            )}
          >
            {label}
          </motion.label>
          <input
            id={id}
            ref={ref}
            value={value}
            defaultValue={defaultValue}
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            className={cn(
              "w-full h-12 px-3.5 pt-3 bg-transparent text-ink text-[14px] outline-none",
              className,
            )}
            {...rest}
          />
        </div>
        {suffix ? (
          <span className="pr-3.5 text-meta text-ink-mute shrink-0">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <span className="text-meta text-danger flex items-center gap-1.5">
          {error}
        </span>
      ) : hint ? (
        <span className="text-meta text-ink-mute">{hint}</span>
      ) : null}
    </div>
  );
});
