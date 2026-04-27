// Reusable "live" indicator — gold dot with pulse halo. CSS-driven so it
// keeps animating even after route transitions.
export function LivePulse({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="live-pulse" />
      {label ? (
        <span className="text-eyebrow text-ink-mute">{label}</span>
      ) : null}
    </span>
  );
}
