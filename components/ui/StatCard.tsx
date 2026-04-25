import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  trend,
  children,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: { value: number; label?: string };
  children?: ReactNode;
  href?: string;
}) {
  const Wrapper = href ? "a" : "div";
  const trendColor =
    trend && trend.value > 0
      ? "text-success"
      : trend && trend.value < 0
        ? "text-error"
        : "text-muted";
  const trendArrow = trend && trend.value >= 0 ? "▲" : "▼";

  return (
    <Wrapper
      href={href}
      className={[
        "block bg-surface border border-line shadow-card p-5 num",
        href ? "hover:border-ink transition-colors" : "",
      ].join(" ")}
    >
      <div className="text-xs uppercase tracking-badge text-muted">{label}</div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-3xl h-display text-ink">{value}</div>
        {children}
      </div>
      {trend ? (
        <div className={`mt-2 text-xs ${trendColor}`}>
          <span>{trendArrow} </span>
          {trend.value > 0 ? "+" : ""}
          {trend.value.toFixed(1)}%{trend.label ? ` ${trend.label}` : ""}
        </div>
      ) : null}
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </Wrapper>
  );
}
