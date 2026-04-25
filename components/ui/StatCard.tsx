import type { ReactNode } from "react";

type Tone = "default" | "hero" | "royal";

const TONE_CLASS: Record<Tone, string> = {
  default: "bg-surface",
  hero: "bg-surface bg-hero-warm",
  royal: "bg-surface bg-hero-royal",
};

export function StatCard({
  label,
  value,
  hint,
  trend,
  children,
  href,
  tone = "default",
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: { value: number; label?: string };
  children?: ReactNode;
  href?: string;
  tone?: Tone;
  accent?: string; // small color stripe at top edge for visual identity
}) {
  const Wrapper = href ? "a" : "div";
  const trendColor =
    trend && trend.value > 0
      ? "text-success"
      : trend && trend.value < 0
        ? "text-error"
        : "text-muted";
  const trendArrow =
    trend && trend.value >= 0 ? (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M2 7l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M2 3l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

  return (
    <Wrapper
      href={href}
      className={[
        "relative block rounded-lg border border-line shadow-card overflow-hidden",
        "p-5 num",
        TONE_CLASS[tone],
        href ? "card-link" : "",
      ].join(" ")}
    >
      {accent ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: accent }}
        />
      ) : null}
      <div className="eyebrow">{label}</div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="h-hero text-[28px] md:text-[32px] text-ink">{value}</div>
        {children ? <div className="shrink-0 -mb-0.5">{children}</div> : null}
      </div>
      {trend ? (
        <div
          className={`mt-3 flex items-center gap-1.5 text-[12px] font-medium ${trendColor}`}
        >
          {trendArrow}
          <span>
            {trend.value > 0 ? "+" : ""}
            {trend.value.toFixed(1)}%
          </span>
          {trend.label ? (
            <span className="text-muted font-normal">· {trend.label}</span>
          ) : null}
        </div>
      ) : null}
      {hint && !trend ? (
        <div className="mt-3 text-[12px] text-muted">{hint}</div>
      ) : null}
    </Wrapper>
  );
}
