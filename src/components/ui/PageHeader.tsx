"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// The page header — title, one line of subtext, an optional action on
// the right.
//
// Eleven routes had spelled this out by hand and drifted: three values
// for the gap under the title, two for whether the action baseline
// aligns with the title or the subtext, and one page that had lost the
// subtext colour. This settles all three.
//
// Presentational and slot-based: it never reads a store, and a caller
// that needs a badge next to the title passes it as `badge` rather than
// re-implementing the row.
export function PageHeader({
  title,
  subtitle,
  /** Sits inline after the title — a status pill, a "bientôt" marker. */
  badge,
  /** Small uppercase line above the title — breadcrumb, section, date. */
  eyebrow,
  /** Right-aligned actions. Wrap under the title on a narrow screen. */
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-eyebrow text-ink-mute mb-2">{eyebrow}</div>
        ) : null}
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-h1 text-ink">{title}</h1>
          {badge}
        </div>
        {subtitle ? (
          <p className="text-body text-ink-soft mt-1.5 max-w-xl">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
