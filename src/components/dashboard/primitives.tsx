"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { resolveIcon } from "@/lib/dashboard/icons";
import type {
  Action,
  Badge as BadgeSpec,
  CtaAction,
  Delta,
  Metric,
  SemanticTone,
  SurfaceTone,
} from "@/lib/dashboard/spec";
import {
  formatDelta,
  formatValue,
  isDeltaPositive,
  metricFormatter,
  numericValue,
} from "@/lib/dashboard/value";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import type { CardVariant } from "@/components/ui/Card";
import { useRole } from "@/lib/auth/role";
import { useCommandRunner } from "./commands";
import { cn } from "@/lib/utils/cn";

// ── Tone bridges ─────────────────────────────────────────────
// Spec tones are the public vocabulary; these map them onto the existing
// Card / Pill implementations so the design system stays the one source
// of truth for what a "sage card" or a "warning pill" looks like.

export function cardVariant(tone: SurfaceTone | undefined): CardVariant {
  return (tone ?? "surface") as CardVariant;
}

const PILL_TONE: Record<SemanticTone, Parameters<typeof Pill>[0]["tone"]> = {
  neutral: "neutral",
  info: "info",
  violet: "violet",
  success: "success",
  warning: "warning",
  danger: "danger",
  live: "live",
  muted: "draft",
};

/** CSS colour for a semantic tone — feed glyphs, accents, borders. */
export const TONE_COLOR: Record<SemanticTone, string> = {
  neutral: "var(--color-ink)",
  info: "var(--color-info)",
  violet: "var(--color-violet-deep)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  live: "var(--color-violet)",
  muted: "var(--color-ink-mute)",
};

// ── Icon ─────────────────────────────────────────────────────

export function Icon({
  name,
  size = 16,
  className,
  strokeWidth = 1.8,
}: {
  name: Parameters<typeof resolveIcon>[0];
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = resolveIcon(name);
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} />;
}

// ── Metric ───────────────────────────────────────────────────

/**
 * The one place a Metric becomes pixels. Count-up is opt-in per metric
 * and automatically skipped for values that can't be animated, so a spec
 * can ask for `animate` without knowing whether the datum is a number.
 */
/** Metric type sizes, named. Inline pixel values were the old spelling. */
const METRIC_SIZE = {
  sm: "text-metric-sm",
  md: "text-metric-md",
  lg: "text-metric-lg",
  xl: "text-metric-xl",
} as const;

export type MetricSize = keyof typeof METRIC_SIZE;

export function MetricValue({
  metric,
  className,
  affixClassName,
  size = "lg",
}: {
  metric: Metric;
  className?: string;
  affixClassName?: string;
  size?: MetricSize;
}) {
  const numeric = numericValue(metric);
  const animate = metric.animate !== false && numeric !== null;

  return (
    <span className={cn("inline-flex items-baseline gap-2 num", className)}>
      {metric.prefix ? (
        <span className={cn("text-h3 text-ink-soft", affixClassName)}>
          {metric.prefix}
        </span>
      ) : null}
      <span className={METRIC_SIZE[size]}>
        {animate ? (
          <AnimatedNumber value={numeric} format={metricFormatter(metric)} />
        ) : (
          formatValue(metric.value, metric.format)
        )}
      </span>
      {metric.suffix ? (
        <span className={cn("text-h3 text-ink-soft", affixClassName)}>
          {metric.suffix}
        </span>
      ) : null}
    </span>
  );
}

/** Inline, non-animated metric text — table cells, meta lines, chips. */
export function MetricText({ metric }: { metric: Metric }) {
  return (
    <span className="num">
      {[metric.prefix, formatValue(metric.value, metric.format), metric.suffix]
        .filter(Boolean)
        .join(" ")}
    </span>
  );
}

export function DeltaChip({ delta }: { delta: Delta }) {
  const good = isDeltaPositive(delta);
  const up = delta.value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-meta font-semibold num",
        good ? "text-success" : "text-danger",
      )}
    >
      {up ? (
        <ArrowUpRight size={14} strokeWidth={2} />
      ) : (
        <ArrowDownRight size={14} strokeWidth={2} />
      )}
      {formatDelta(delta)}
      <span className="text-ink-mute font-medium">· {delta.period}</span>
    </span>
  );
}

// ── Badge ────────────────────────────────────────────────────

export function SpecBadge({ badge }: { badge: BadgeSpec }) {
  return (
    <Pill tone={PILL_TONE[badge.tone ?? "neutral"]} dot={badge.dot}>
      {badge.icon ? (
        <Icon name={badge.icon} size={11} strokeWidth={2} className="-ml-0.5" />
      ) : null}
      {badge.label}
    </Pill>
  );
}

// ── Actions ──────────────────────────────────────────────────

/**
 * Renders a spec Action. Links navigate; commands are dispatched through
 * the client command registry. A spec can therefore ask for behaviour
 * (open the reservation sheet, start a service) without shipping a
 * function — which is what keeps it JSON.
 */
export function ActionControl({
  cta,
  size = "md",
  className,
}: {
  cta: CtaAction;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const role = useRole();
  const run = useCommandRunner();
  const { action } = cta;
  const variant = cta.variant ?? "primary";

  // Role-gated CTAs render nothing until the role resolves, matching the
  // existing RoleGate behaviour (no flash of a disappearing button).
  if (cta.allow) {
    if (role === null) return null;
    if (!cta.allow.includes(role)) return null;
  }

  const buttonVariant =
    variant === "primary" ? "ink" : variant === "secondary" ? "secondary" : "ghost";

  const inner = (
    <Button
      variant={buttonVariant}
      size={size}
      className={className}
      iconLeft={action.icon ? <Icon name={action.icon} size={16} strokeWidth={2} /> : undefined}
      onClick={
        action.kind === "command"
          ? () => run(action.command, action.payload)
          : undefined
      }
    >
      {action.label}
    </Button>
  );

  if (action.kind === "link") {
    return action.external ? (
      <a href={action.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    ) : (
      <Link href={action.href}>{inner}</Link>
    );
  }
  return inner;
}

/** Text-only affordance used by section headings ("Tout voir →"). */
export function ActionLink({
  action,
  className,
}: {
  action: Action;
  className?: string;
}) {
  const run = useCommandRunner();
  const cls = cn(
    "inline-flex items-center gap-1.5 h-10 px-3 text-[13px] font-semibold",
    "border border-line bg-surface rounded-[var(--radius-sm)] text-ink",
    "hover:border-ink transition-colors",
    className,
  );

  if (action.kind === "link") {
    return (
      <Link href={action.href} className={cls}>
        {action.icon ? <Icon name={action.icon} size={14} /> : null}
        {action.label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={() => run(action.command, action.payload)}
    >
      {action.icon ? <Icon name={action.icon} size={14} /> : null}
      {action.label}
    </button>
  );
}

/** Wraps children in a link only when the spec supplied an href. */
export function MaybeLink({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
