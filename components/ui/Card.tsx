import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
  tone?: "default" | "hero" | "royal";
}

const TONE: Record<NonNullable<CardProps["tone"]>, string> = {
  default: "bg-surface",
  hero: "bg-surface bg-hero-warm",
  royal: "bg-surface bg-hero-royal",
};

export function Card({
  children,
  padded = true,
  tone = "default",
  className = "",
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "border border-line rounded-lg shadow-card overflow-hidden",
        TONE[tone],
        padded ? "p-6" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  size = "md",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const titleClass =
    size === "lg"
      ? "h-display text-xl text-ink"
      : size === "sm"
        ? "h-display text-sm text-ink"
        : "h-display text-base text-ink";
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="min-w-0">
        <h3 className={titleClass}>{title}</h3>
        {subtitle ? (
          <p className="text-[13px] text-muted mt-1 leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
