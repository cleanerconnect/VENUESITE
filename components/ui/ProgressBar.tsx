export function ProgressBar({
  value,
  max,
  tone = "ink",
}: {
  value: number;
  max: number;
  tone?: "ink" | "gold" | "success";
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const fill =
    tone === "gold"
      ? "#D8A83B"
      : tone === "success"
        ? "#2F6B3D"
        : "#0F0F0F";
  return (
    <div
      className="w-full h-1.5 bg-line/60 overflow-hidden"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundColor: fill }}
      />
    </div>
  );
}
