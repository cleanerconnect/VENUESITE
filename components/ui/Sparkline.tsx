// Tiny inline-SVG sparkline. No dep. Used by stat cards.

export function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = "#0F0F0F",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(1, max - min);
  const stepX = width / (data.length - 1 || 1);
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const pathD = `M ${points.replace(/ /g, " L ")}`;

  return (
    <svg
      className="spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path d={pathD} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}
