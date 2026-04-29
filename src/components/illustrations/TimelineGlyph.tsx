"use client";

import { useEffect, useState } from "react";

// Calm horizontal timeline glyph shown on the dashboard's empty
// upcoming-events block. A baseline path gently waves up and down with
// violet event-dots distributed along it. Decorative — never carries
// information the user needs.
//
// The pulse + drift animations are CSS-driven via the .ill-* classes
// in globals.css, so they automatically respect prefers-reduced-motion
// and disappear on mobile (we also opt out via JS for any client that
// reports the matchMedia).
export function TimelineGlyph({ className }: { className?: string }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    setAnimate(!reduced && !mobile);
  }, []);

  return (
    <svg
      role="img"
      aria-label="Illustration · chronologie d'événements"
      viewBox="0 0 480 200"
      className={className}
      style={{ maxHeight: 280, width: "100%", height: "auto" }}
    >
      <defs>
        <linearGradient id="tl-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-line)" />
          <stop offset="50%" stopColor="var(--color-violet)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-line)" />
        </linearGradient>
        <radialGradient id="tl-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="var(--color-violet)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-violet)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Faint grid baseline */}
      <g stroke="var(--color-line-soft)" strokeWidth="1">
        <line x1="0" y1="100" x2="480" y2="100" />
        <line x1="0" y1="60" x2="480" y2="60" strokeDasharray="2 6" />
        <line x1="0" y1="140" x2="480" y2="140" strokeDasharray="2 6" />
      </g>

      {/* Wandering path — feels like a sales / engagement curve */}
      <path
        d="M 10 130 C 70 100, 110 80, 160 95 S 240 140, 290 110 S 370 60, 430 78 L 470 84"
        fill="none"
        stroke="url(#tl-line)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Subtle filled area beneath the path for editorial weight */}
      <path
        d="M 10 130 C 70 100, 110 80, 160 95 S 240 140, 290 110 S 370 60, 430 78 L 470 84 L 470 180 L 10 180 Z"
        fill="var(--color-violet)"
        fillOpacity="0.05"
      />

      {/* Event-dot timeline */}
      {[
        { x: 70, y: 102 },
        { x: 160, y: 95 },
        { x: 240, y: 132 },
        { x: 330, y: 92 },
        { x: 420, y: 80 },
      ].map((dot, i) => (
        <g key={i} className={animate ? "ill-pulse" : undefined} style={{ animationDelay: `${i * 0.6}s` }}>
          <circle cx={dot.x} cy={dot.y} r="18" fill="url(#tl-glow)" />
          <circle
            cx={dot.x}
            cy={dot.y}
            r="4.5"
            fill="var(--color-canvas)"
            stroke="var(--color-violet)"
            strokeWidth="1.8"
          />
        </g>
      ))}
    </svg>
  );
}
