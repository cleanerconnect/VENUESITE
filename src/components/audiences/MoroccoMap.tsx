"use client";

import type { GeoPoint } from "@/lib/types/analytics";

// Hand-drawn simplified Morocco outline for the audiences geo
// heatmap. The path coordinates are normalized to a 100×140 viewBox so
// city dots can sit on stable positions across browser sizes.
//
// Demo geometry, not topographically accurate — the goal is a
// recognisable silhouette with bubbles in the right approximate
// positions (Casa central-west, Tanger top, Marrakech lower-central,
// Agadir bottom-left).
const MOROCCO_PATH =
  "M 50 6 L 60 10 L 70 18 L 76 28 L 78 38 L 76 48 L 72 58 L 70 70 L 64 80 L 58 88 L 52 96 L 48 104 L 42 110 L 36 116 L 28 122 L 22 128 L 18 132 L 14 130 L 10 124 L 8 116 L 10 106 L 12 96 L 14 86 L 12 76 L 10 66 L 12 56 L 16 46 L 20 38 L 26 30 L 32 22 L 40 14 L 46 8 Z";

// Colour scale: violet at high share, sand at low share, sky for
// international (off-map). Bubble radius scales with share too —
// minimum 4 for legibility, max 18.
function bubbleRadius(share: number): number {
  return 4 + Math.min(14, share * 0.24);
}

export function MoroccoMap({ geo }: { geo: GeoPoint[] }) {
  // Split domestic vs international (international placed at x>=80
  // by the data layer).
  const domestic = geo.filter((g) => g.x < 80);
  const intl = geo.filter((g) => g.x >= 80);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
      <div className="relative w-full max-w-[420px] mx-auto">
        <svg
          viewBox="0 0 100 140"
          className="w-full h-auto"
          aria-label="Carte du Maroc — répartition de l'audience par ville"
        >
          {/* Country silhouette */}
          <path
            d={MOROCCO_PATH}
            fill="var(--color-canvas-2)"
            stroke="var(--color-line)"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Bubbles */}
          {domestic.map((p) => (
            <g key={p.city}>
              <circle
                cx={p.x}
                cy={p.y}
                r={bubbleRadius(p.share)}
                fill="var(--color-violet)"
                fillOpacity={0.18}
                stroke="var(--color-violet-deep)"
                strokeWidth={0.6}
              />
              <circle cx={p.x} cy={p.y} r={1.6} fill="var(--color-violet-deep)" />
              <text
                x={p.x}
                y={p.y - bubbleRadius(p.share) - 1.6}
                textAnchor="middle"
                fontSize="3.2"
                fontWeight="600"
                fill="var(--color-ink)"
              >
                {p.city}
              </text>
              <text
                x={p.x}
                y={p.y - bubbleRadius(p.share) + 2.6}
                textAnchor="middle"
                fontSize="2.6"
                fontWeight="500"
                fill="var(--color-ink-soft)"
              >
                {p.share.toFixed(1).replace(".", ",")} %
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* International tile + city table */}
      <div className="space-y-4 min-w-[200px]">
        {intl.length > 0 ? (
          <div className="bg-tint-sky border-l-2 border-info rounded-[var(--radius-md)] px-4 py-3">
            <div className="text-eyebrow text-info">International</div>
            <div className="mt-2 space-y-1">
              {intl.map((p) => (
                <div
                  key={p.city}
                  className="flex items-baseline justify-between gap-3 text-meta num"
                >
                  <span className="text-ink">{p.city}</span>
                  <span className="text-ink-soft">
                    {p.share.toFixed(1).replace(".", ",")} %
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="text-eyebrow text-ink-mute mb-2">Top villes</div>
          <ul className="space-y-1.5">
            {[...domestic]
              .sort((a, b) => b.share - a.share)
              .slice(0, 5)
              .map((p) => (
                <li
                  key={p.city}
                  className="flex items-baseline justify-between gap-3 text-meta num"
                >
                  <span className="text-ink">{p.city}</span>
                  <span className="text-ink-soft">
                    {p.share.toFixed(1).replace(".", ",")} %
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
