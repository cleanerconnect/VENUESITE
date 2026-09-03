"use client";

import { Specimen } from "../Shell";

// Tokens, read straight from the CSS custom properties. Nothing here is
// hard-coded — if `globals.css` changes, this page changes with it, so
// the swatches can never go stale.

const COLOR_GROUPS: { label: string; tokens: string[] }[] = [
  {
    label: "Encre et texte",
    tokens: [
      "ink",
      "ink-soft",
      "ink-mute",
      "on-ink",
      "on-ink-mute",
      "on-ink-cool",
    ],
  },
  {
    label: "Accent",
    tokens: [
      "violet",
      "violet-deep",
      "violet-soft",
      "violet-on-ink",
      "gold",
      "gold-deep",
      "gold-soft",
    ],
  },
  {
    label: "Surfaces",
    tokens: ["canvas", "canvas-2", "surface", "surface-ink"],
  },
  {
    label: "Teintes de carte",
    tokens: ["tint-sand", "tint-sky", "tint-sage", "tint-rose", "tint-peach"],
  },
  { label: "Sémantique", tokens: ["success", "warning", "danger", "info"] },
  { label: "Traits", tokens: ["line", "line-soft", "line-strong"] },
  {
    label: "Data visualisation",
    tokens: [
      "series-1",
      "series-2",
      "series-3",
      "series-4",
      "series-5",
      "series-6",
      "chart-axis",
      "chart-grid",
      "chart-projection",
    ],
  },
];

const TYPE_SCALE = [
  "text-display",
  "text-h1",
  "text-h2",
  "text-h3",
  "text-body",
  "text-meta",
  "text-eyebrow",
  "text-mono",
];

const METRIC_SCALE = [
  "text-metric-xl",
  "text-metric-lg",
  "text-metric-md",
  "text-metric-sm",
];

const RADII = ["xs", "sm", "chip", "md", "lg", "xl", "pill"];
const SHADOWS = ["soft", "lift", "deep"];
const DURATIONS = ["instant", "fast", "base", "slow"];

// The spacing steps the portal actually uses, in units of `--spacing`.
// Every bar below is sized with `calc(var(--spacing) * n)` rather than a
// pixel literal, so changing the base unit in globals.css moves this
// specimen with it.
const SPACING_STEPS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 32,
];

export function TokensSection() {
  return (
    <>
      {COLOR_GROUPS.map((group) => (
        <Specimen key={group.label} name={group.label}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {group.tokens.map((token) => (
              <div key={token} className="min-w-0">
                <div
                  className="h-14 rounded-[var(--radius-sm)] border border-line"
                  style={{ background: `var(--color-${token})` }}
                />
                <code className="block text-[11px] text-ink-soft mt-1.5 truncate">
                  --color-{token}
                </code>
              </div>
            ))}
          </div>
        </Specimen>
      ))}

      <Specimen name="Échelle typographique" note="classes utilitaires">
        <div className="space-y-4">
          {TYPE_SCALE.map((cls) => (
            <div key={cls} className="flex items-baseline gap-4 flex-wrap">
              <code className="text-[11px] text-ink-mute w-28 shrink-0">
                .{cls}
              </code>
              <span className={`${cls} text-ink`}>
                Réservations du soir · 128
              </span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Échelle des chiffres"
        note="les grands nombres d'un KPI ou d'un hero"
      >
        <div className="space-y-4">
          {METRIC_SCALE.map((cls) => (
            <div key={cls} className="flex items-baseline gap-4 flex-wrap">
              <code className="text-[11px] text-ink-mute w-28 shrink-0">
                .{cls}
              </code>
              <span className={`${cls} text-ink num`}>63 400</span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen name="Rayons">
        <div className="flex flex-wrap gap-4">
          {RADII.map((r) => (
            <div key={r} className="text-center">
              <div
                className="h-16 w-16 bg-violet-soft border border-line"
                style={{ borderRadius: `var(--radius-${r})` }}
              />
              <code className="block text-[11px] text-ink-soft mt-1.5">{r}</code>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen
        name="Espacement"
        note="une seule base — --spacing: 4px — dont dérive chaque utilitaire"
      >
        <div className="space-y-2">
          {SPACING_STEPS.map((step) => (
            <div key={step} className="flex items-center gap-3">
              <code className="text-[11px] text-ink-mute w-24 shrink-0">
                gap-{step}
              </code>
              <div
                className="h-3 bg-violet rounded-[var(--radius-xs)] shrink-0"
                style={{ width: `calc(var(--spacing) * ${step})` }}
              />
              <span className="text-[11px] text-ink-soft num">
                {step * 4}&#8239;px
              </span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen name="Ombres" note="méritées, jamais par défaut">
        <div className="flex flex-wrap gap-6">
          {SHADOWS.map((s) => (
            <div key={s} className="text-center">
              <div
                className="h-16 w-28 bg-surface rounded-[var(--radius-lg)]"
                style={{ boxShadow: `var(--shadow-${s})` }}
              />
              <code className="block text-[11px] text-ink-soft mt-2">{s}</code>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen name="Mouvement" note="une seule courbe, quatre durées — survolez">
        <div className="flex flex-wrap gap-4">
          {DURATIONS.map((d) => (
            <div key={d} className="text-center">
              <div
                className="h-16 w-28 bg-violet-soft rounded-[var(--radius-lg)] hover:bg-violet hover:scale-105"
                style={{
                  transitionProperty: "background-color, transform",
                  transitionDuration: `var(--duration-${d})`,
                  transitionTimingFunction: "var(--ease-out-expo)",
                }}
              />
              <code className="block text-[11px] text-ink-soft mt-2">{d}</code>
            </div>
          ))}
        </div>
      </Specimen>
    </>
  );
}
