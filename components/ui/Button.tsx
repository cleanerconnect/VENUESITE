import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT: Record<Variant, string> = {
  // Primary — subtle vertical gradient + soft shadow + bright hover.
  primary:
    "bg-gradient-to-b from-[#1a1a1a] to-ink text-white shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_1px_2px_rgba(15,15,15,0.25)] hover:from-[#2a2a2a] hover:to-[#1a1a1a] active:translate-y-px disabled:opacity-50",
  secondary:
    "bg-surface text-ink border border-line-strong/60 hover:border-ink hover:bg-bg-soft disabled:opacity-50",
  destructive:
    "bg-error text-white hover:bg-error/90 disabled:opacity-50",
  ghost:
    "bg-transparent text-ink hover:bg-ink/5 disabled:opacity-50",
  gold:
    "bg-gradient-to-b from-[#e2b54a] to-[#cc9a2e] text-ink shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_2px_6px_rgba(216,168,59,0.3)] hover:brightness-105 active:translate-y-px",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-7 text-[15px]",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    fullWidth,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md font-medium",
        "transition-all duration-150 ease-out-expo",
        VARIANT[variant],
        SIZE[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {iconLeft ? <span className="shrink-0 -ml-0.5">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="shrink-0 -mr-0.5">{iconRight}</span> : null}
    </button>
  );
});
