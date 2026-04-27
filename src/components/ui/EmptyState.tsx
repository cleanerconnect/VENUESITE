import type { ReactNode } from "react";
import { Button } from "./Button";

// Empty states are a moment — Fraunces serif headline, one-sentence subtitle,
// optional CTA. Used on My Events, Refunds, Activity, etc.
export function EmptyState({
  title,
  description,
  cta,
  illustration,
}: {
  title: string;
  description?: string;
  cta?: { label: string; onClick?: () => void; href?: string };
  illustration?: ReactNode;
}) {
  return (
    <div className="bg-canvas-2 rounded-[var(--radius-xl)] py-14 px-6 text-center flex flex-col items-center gap-4">
      {illustration ?? <DefaultMark />}
      <h3
        className="font-serif-italic text-[28px] leading-tight text-ink"
        style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}
      >
        {title}
      </h3>
      {description ? (
        <p className="text-body text-ink-soft max-w-sm">{description}</p>
      ) : null}
      {cta ? (
        cta.href ? (
          <a href={cta.href}>
            <Button>{cta.label}</Button>
          </a>
        ) : (
          <Button onClick={cta.onClick}>{cta.label}</Button>
        )
      ) : null}
    </div>
  );
}

function DefaultMark() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="opacity-70"
    >
      <circle cx="24" cy="24" r="22" stroke="#0A1F3D" strokeWidth="1.4" />
      <circle cx="24" cy="24" r="6" fill="#C9A64C" />
    </svg>
  );
}
