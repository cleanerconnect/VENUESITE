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

// Shown twice — once at each density — so the difference is the
// specimen rather than a paragraph claiming there is one.
const HOST_SPECIMEN = [
  { cls: "text-h2", sample: "Prochaines arrivées" },
  { cls: "text-body", sample: "Confirmées, pas encore en salle." },
  { cls: "text-meta", sample: "Grande salle · Téléphone" },
  { cls: "text-eyebrow", sample: "Aujourd'hui" },
];

const HOST_BANDS = [
  {
    label: "Arrivé",
    bar: "bg-success",
    text: "text-success",
    time: "19h00",
    party: "4 couverts",
    name: "Salma Bennani",
    detail: "Patio · LYFE",
  },
  {
    label: "À confirmer",
    bar: "bg-warning",
    text: "text-warning",
    time: "20h00",
    party: "2 couverts",
    name: "Nabil Cherkaoui",
    detail: "LYFE",
  },
  {
    label: "Confirmée",
    bar: "bg-ink-mute",
    text: "text-ink-soft",
    time: "20h30",
    party: "5 couverts",
    name: "Hind Tazi",
    detail: "Grande salle · Téléphone",
  },
  {
    label: "Absent",
    bar: "bg-danger",
    text: "text-danger",
    time: "21h00",
    party: "3 couverts",
    name: "Groupe Anfa",
    detail: "Terrasse · Téléphone",
  },
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
        name="Densité host · le Dashboard basique"
        note="data-density=&quot;host&quot; — mêmes jetons, autre échelle"
      >
        <p className="text-body text-ink-soft mb-5 max-w-2xl">
          Lot 1 est lu par un restaurateur debout à un pupitre, pas assis à
          un bureau. Le système ne change pas : les jetons, les composants
          et les couleurs sont les mêmes. Ce qui change est l&apos;échelle —
          16 px de base, rien sous 13 px, le texte secondaire en encre à
          70 % plutôt qu&apos;en gris, et 44 px de hauteur minimum sur
          chaque contrôle. C&apos;est un mode : un composant qui n&apos;a
          jamais entendu parler du Lot 1 sort juste à l&apos;intérieur.
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="text-eyebrow text-ink-mute mb-3">
              Lot 2 · densité par défaut
            </div>
            <div className="border border-line rounded-[var(--radius-md)] p-4 space-y-3">
              {HOST_SPECIMEN.map((row) => (
                <div key={row.cls} className="flex items-baseline gap-3">
                  <code className="text-[11px] text-ink-mute w-24 shrink-0">
                    .{row.cls}
                  </code>
                  <span className={`${row.cls} text-ink`}>{row.sample}</span>
                </div>
              ))}
            </div>
          </div>

          <div data-density="host">
            <div className="text-eyebrow text-ink-mute mb-3">
              Lot 1 · densité host
            </div>
            <div className="border border-line rounded-[var(--radius-md)] p-4 space-y-3">
              {HOST_SPECIMEN.map((row) => (
                <div key={row.cls} className="flex items-baseline gap-3">
                  <code className="text-[11px] text-ink-mute w-24 shrink-0">
                    .{row.cls}
                  </code>
                  <span className={`${row.cls} text-ink`}>{row.sample}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-eyebrow text-ink-mute mb-3">
            La ligne de réservation
          </div>
          <p className="text-meta text-ink-mute mb-3 max-w-2xl">
            L&apos;heure et le nombre de couverts décident de ce qui se
            passe dans les dix minutes : ils passent en premier et en plus
            gros. Le nom vient ensuite, parce que c&apos;est ce qu&apos;on
            dit à voix haute. Le reste est du contexte. L&apos;état est une
            bande sur le bord gauche <em>et</em> un mot — la couleur se lit
            de loin, le mot survit à une impression en noir et blanc.
          </p>
          <div className="space-y-3 max-w-xl">
            {HOST_BANDS.map((b) => (
              <div
                key={b.label}
                className="relative bg-surface border border-line rounded-[var(--radius-lg)] overflow-hidden"
              >
                <span
                  aria-hidden
                  className={`absolute left-0 top-0 bottom-0 w-[6px] ${b.bar}`}
                />
                <div className="flex items-center gap-4 p-4 pl-6">
                  <div className="shrink-0 text-right w-[104px]">
                    <div className="text-host-lead text-ink">{b.time}</div>
                    <div className="text-host-lead text-ink mt-0.5">
                      {b.party}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-host-name text-ink">{b.name}</span>
                      <span className={`text-host-detail font-semibold ${b.text}`}>
                        {b.label}
                      </span>
                    </div>
                    <div className="text-host-detail mt-1">{b.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
