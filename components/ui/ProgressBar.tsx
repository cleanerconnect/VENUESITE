export function ProgressBar({
  value,
  max,
  tone = "ink",
  size = "md",
}: {
  value: number;
  max: number;
  tone?: "ink" | "gold" | "success" | "royal";
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const fillStyle: Record<string, string> = {
    ink: "linear-gradient(90deg, #1a1a1a 0%, #0f0f0f 100%)",
    gold: "linear-gradient(90deg, #e2b54a 0%, #cc9a2e 100%)",
    success: "linear-gradient(90deg, #3a7d4a 0%, #2F6B3D 100%)",
    royal: "linear-gradient(90deg, #2f4ea3 0%, #253E86 100%)",
  };
  const heightClass = size === "sm" ? "h-1" : "h-1.5";
  return (
    <div
      className={`w-full ${heightClass} bg-line/70 overflow-hidden rounded-full`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out-expo"
        style={{ width: `${pct}%`, background: fillStyle[tone] }}
      />
    </div>
  );
}
