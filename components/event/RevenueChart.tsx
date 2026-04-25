// Plain SVG line+area chart with smooth interpolation. No chart library.

export function RevenueChart({
  data,
}: {
  data: { day: string; amount: number }[];
}) {
  const W = 720;
  const H = 240;
  const padding = { top: 18, right: 18, bottom: 28, left: 52 };
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.amount), 1);
  const stepX = innerW / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + (1 - d.amount / max) * innerH;
    return [x, y] as const;
  });

  // Catmull-Rom-ish smoothing for a refined line.
  const smooth = (pts: readonly (readonly [number, number])[]) => {
    if (pts.length < 2) return "";
    const path = [`M ${pts[0][0]},${pts[0][1]}`];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const t = 0.18;
      const cp1x = p1[0] + (p2[0] - p0[0]) * t;
      const cp1y = p1[1] + (p2[1] - p0[1]) * t;
      const cp2x = p2[0] - (p3[0] - p1[0]) * t;
      const cp2y = p2[1] - (p3[1] - p1[1]) * t;
      path.push(
        `C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`,
      );
    }
    return path.join(" ");
  };

  const linePath = smooth(points);
  const areaPath =
    linePath +
    ` L ${points[points.length - 1][0].toFixed(1)},${(padding.top + innerH).toFixed(1)}` +
    ` L ${points[0][0].toFixed(1)},${(padding.top + innerH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: padding.top + (1 - p) * innerH,
    label: Math.round(max * p),
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Évolution du chiffre d'affaires"
    >
      <defs>
        <linearGradient id="rev-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#253E86" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#253E86" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="rev-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#253E86" />
          <stop offset="100%" stopColor="#2f4ea3" />
        </linearGradient>
      </defs>

      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={W - padding.right}
            y1={t.y}
            y2={t.y}
            stroke="#E8E1CE"
            strokeDasharray="2 4"
          />
          <text
            x={padding.left - 8}
            y={t.y + 4}
            textAnchor="end"
            className="fill-current num"
            style={{ fontSize: 10, fill: "#9A9588" }}
          >
            {t.label}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="url(#rev-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="url(#rev-line)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Last-point emphasis dot */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="4"
        fill="#253E86"
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="8"
        fill="#253E86"
        opacity="0.15"
      />
    </svg>
  );
}
