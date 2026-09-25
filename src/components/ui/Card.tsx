import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

// Bento card system, variants paint distinct surface treatments so a screen
// can compose tinted, white, and dark cards side-by-side without looking
// like a uniform shadcn stack.
export type CardVariant =
  | "surface" // white, default, hairline border, no shadow
  | "ink" // dark navy, single-use per screen, gets the gold radial glow
  | "sand"
  | "sky"
  | "sage"
  | "rose"
  | "peach"
  // There used to be a "gold-soft" variant alongside this one, painting the
  // same bg-violet-soft. Two names, one surface, and no way to tell from a
  // call site which was intended. Callers now say "violet-soft".
  | "violet-soft" // AI surfaces only, never decoration
  | "canvas-2"; // sidebar/footer surface

export type CardSize = "sm" | "md" | "lg" | "hero";

const VARIANT: Record<CardVariant, string> = {
  surface: "bg-surface border border-line",
  ink: "bg-surface-ink text-canvas",
  sand: "bg-tint-sand",
  sky: "bg-tint-sky",
  sage: "bg-tint-sage",
  rose: "bg-tint-rose",
  peach: "bg-tint-peach",
  "violet-soft": "bg-violet-soft",
  "canvas-2": "bg-canvas-2 border border-line-soft",
};

const SIZE: Record<CardSize, string> = {
  sm: "p-4 rounded-[var(--radius-lg)]",
  md: "p-6 rounded-[var(--radius-xl)]",
  lg: "p-7 rounded-[var(--radius-xl)]",
  hero: "p-8 rounded-[var(--radius-xl)]",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  glow?: boolean; // adds the gold radial glow used on hero ink cards
  children: ReactNode;
}

export function Card({
  variant = "surface",
  size = "md",
  glow = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {glow ? (
        <>
          {/* Violet radial glow, top right */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--color-violet) 34%, transparent), transparent 70%)",
            }}
          />
          {/* Lighter secondary glow, bottom right */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 right-20 w-56 h-56 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--color-violet) 14%, transparent), transparent 70%)",
            }}
          />
        </>
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
