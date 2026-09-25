"use client";

import { cn } from "@/lib/utils/cn";

// Loading placeholders.
//
// The portal had none: every route rendered nothing until its data
// arrived, which on a phone over 3G reads as a broken app. These are
// shape-matched to the real components — a skeleton that does not match
// the layout it precedes causes a jump on load, which is worse than a
// spinner.
//
// `Skeleton` is the atom; the named blocks below cover the four shapes
// the portal actually loads into.

export function Skeleton({
  className,
  /** Rounded to a pill for text lines, to the card radius for surfaces. */
  shape = "line",
  style,
}: {
  className?: string;
  shape?: "line" | "card" | "circle";
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        "animate-pulse bg-ink/[0.06]",
        shape === "line" && "h-3 rounded-full",
        shape === "card" && "rounded-[var(--radius-xl)]",
        shape === "circle" && "rounded-full",
        className,
      )}
    />
  );
}

/** Announces the wait to a screen reader; the shapes themselves are hidden. */
export function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-56 rounded-[var(--radius-sm)]" />
      <Skeleton className="w-80 max-w-full" />
    </div>
  );
}

/** Matches `MetricTile`: label row, value, meta line. */
export function MetricTileSkeleton() {
  return (
    <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-6">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="w-24" />
        <Skeleton shape="card" className="h-9 w-9" />
      </div>
      <Skeleton className="h-10 w-28 mt-5 rounded-[var(--radius-sm)]" />
      <Skeleton className="w-20 mt-3" />
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricTileSkeleton key={i} />
      ))}
    </div>
  );
}

/** Matches an `entity-list` row: avatar, two lines, trailing metric. */
export function EntityListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-line bg-surface divide-y divide-line-soft">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton shape="circle" className="h-10 w-10 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="w-40 max-w-full" />
            <Skeleton className="w-24" />
          </div>
          <Skeleton className="w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-6">
      <Skeleton className="w-32 mb-6" />
      <Skeleton shape="card" style={{ height }} className="w-full" />
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-line bg-surface p-6 space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="w-24" />
          <Skeleton shape="card" className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
