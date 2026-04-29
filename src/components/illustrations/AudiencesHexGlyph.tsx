"use client";

import { useEffect, useState } from "react";

// Six abstract user-segment circles in a hexagonal arrangement, each
// in a different LYFE palette tint, with soft connecting lines. The
// center holds a violet glow that gently breathes. Used above the
// progress bar in /audiences when the account is still locked.
//
// Pulse animations are CSS-driven and disabled on mobile + under
// prefers-reduced-motion via the same gate as the timeline glyph.
export function AudiencesHexGlyph({ className }: { className?: string }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    setAnimate(!reduced && !mobile);
  }, []);

  // Hexagonal arrangement: one center node + 6 vertices at radius 70
  // around (140, 130). Tint per node uses different palette swatches
  // so the visualisation reads as "diverse audience segments".
  const center = { x: 140, y: 130 };
  const radius = 70;
  const nodes = Array.from({ length: 6 }).map((_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2; // start at top
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });

  // Different fill per vertex node — palette tints in muted form so
  // they read as soft segments, not status colours.
  const tints = [
    "var(--color-violet-soft)",
    "var(--color-gold-soft)",
    "var(--color-canvas-2)",
    "var(--color-tint-peach)",
    "var(--color-tint-sage)",
    "var(--color-tint-sky)",
  ];

  return (
    <svg
      role="img"
      aria-label="Illustration · segments d'audience"
      viewBox="0 0 280 260"
      className={className}
      style={{ maxHeight: 240, width: "100%", height: "auto" }}
    >
      <defs>
        <radialGradient id="aud-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--color-violet)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-violet)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Connecting lines from center to each vertex — soft violet */}
      <g
        stroke="var(--color-violet)"
        strokeOpacity="0.25"
        strokeWidth="1.2"
        strokeDasharray="2 4"
      >
        {nodes.map((n, i) => (
          <line key={i} x1={center.x} y1={center.y} x2={n.x} y2={n.y} />
        ))}
      </g>

      {/* Halo behind the center — pulses softly */}
      <g className={animate ? "ill-pulse" : undefined}>
        <circle cx={center.x} cy={center.y} r="60" fill="url(#aud-glow)" />
      </g>

      {/* Vertex segment circles */}
      {nodes.map((n, i) => (
        <g
          key={i}
          className={animate ? "ill-pulse" : undefined}
          style={{ animationDelay: `${i * 0.5}s` }}
        >
          <circle
            cx={n.x}
            cy={n.y}
            r="22"
            fill={tints[i]}
            stroke="var(--color-violet)"
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
        </g>
      ))}

      {/* Central violet anchor */}
      <circle
        cx={center.x}
        cy={center.y}
        r="14"
        fill="var(--color-violet)"
        fillOpacity="0.9"
      />
      <circle
        cx={center.x}
        cy={center.y}
        r="6"
        fill="var(--color-canvas)"
      />
    </svg>
  );
}
