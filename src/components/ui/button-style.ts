// The button's classes, without the button.
//
// Split out of `Button.tsx` because that file is `"use client"` — it
// animates on press — and a module marked client cannot export a plain
// function a server component calls: Next turns every export into a
// client reference, and calling one on the server throws « Attempted to
// call buttonClass() from the server ». The empty dashboard is a server
// component whose action is a `<Link>`, so the classes have to live in a
// module that is neither.
//
// Both files read these, and that is the point: two spellings of the
// primary button is one of them going stale.

import { cn } from "@/lib/utils/cn";

export type Variant = "primary" | "secondary" | "destructive" | "ghost" | "ink";
export type Size = "sm" | "md" | "lg";

// Violet is the only chrome accent. Primary CTA + ink variant for the
// rare dark-surface action.
export const VARIANT: Record<Variant, string> = {
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
export const SIZE: Record<Size, string> = {
  sm: "h-9 px-4 text-control-sm rounded-[var(--radius-sm)]",
  md: "h-11 px-6 text-control-md rounded-[var(--radius-sm)]",
  lg: "h-14 px-8 text-control-lg rounded-[var(--radius-md)]",
};

export const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150";

/**
 * The same classes, for a link that has to look like the primary
 * action.
 *
 * A `<Link>` is not a `<button>`, and the one place that matters is a
 * navigation dressed as a commit — « Créer mon établissement » on the
 * empty dashboard goes somewhere, so it is an anchor, and a partner
 * middle-clicking it should get a tab.
 */
export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
): string {
  return cn(BUTTON_BASE, VARIANT[variant], SIZE[size], className);
}
