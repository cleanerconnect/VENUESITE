// Plain SVG line+area chart — no chart library. Sized via parent.

export function RevenueChart({
  data,
}: {
  data: { day: string; amount: number }[];
}) {
  const W = 720;
  const H = 220;
  const padding = { top: 10, right: 10, bottom: 24, left: 44 };
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;

  const max = Math.max(...data.map((d) => d.amount), 1);
  const stepX = innerW / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + (1 - d.amount / max) * innerH;
    return [x, y];
  });

  const linePath =
    "M " + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");
  const areaPath =
    linePath +
    ` L ${points[points.length - 1][0].toFixed(1)},${(padding.top + innerH).toFixed(1)}` +
    ` L ${points[0][0].toFixed(1)},${(padding.top + innerH).toFixed(1)} Z`;

  // Simple Y axis ticks.
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
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={W - padding.right}
            y1={t.y}
            y2={t.y}
            stroke="#E0DAC7"
            strokeDasharray="2 4"
          />
          <text
            x={padding.left - 6}
            y={t.y + 3}
            textAnchor="end"
            className="text-[10px] fill-current text-muted num"
            style={{ fontSize: 10 }}
          >
            {t.label}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="rgba(201, 166, 76, 0.15)" />
      <path d={linePath} fill="none" stroke="#0A1F3D" strokeWidth={1.5} />

      {points.map(([x, y], i) =>
        i % 5 === 0 ? <circle key={i} cx={x} cy={y} r={2} fill="#0A1F3D" /> : null,
      )}
    </svg>
  );
}
