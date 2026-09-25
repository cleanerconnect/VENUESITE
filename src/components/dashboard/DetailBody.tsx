"use client";

import type { DetailSpec } from "@/lib/dashboard/spec";
import { Icon, MetricText } from "./primitives";

// The body of a detail panel: labelled sections of metric rows, then any
// notes. Split out of `DetailDrawer` so it can be rendered anywhere a
// spec is available — inline on a wide screen, in the styleguide, or in
// a print view — without dragging the drawer surface along.
//
// Props-only. Give it a spec, get markup.
export function DetailBody({ spec }: { spec: DetailSpec }) {
  return (
    <div className="space-y-7">
      {spec.sections?.map((section) => (
        <section key={section.label}>
          <div className="text-eyebrow text-ink-mute mb-3">{section.label}</div>
          <dl className="divide-y divide-line-soft">
            {section.items.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-4 py-2.5"
              >
                <dt className="text-[13.5px] text-ink-soft">{item.label}</dt>
                <dd className="text-[13.5px] font-semibold text-ink text-right num">
                  <MetricText metric={item.metric} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {spec.notes?.length ? (
        <section className="space-y-2">
          {spec.notes.map((note, i) => (
            <div
              key={`${note.label}-${i}`}
              className="flex items-start gap-2.5 bg-violet-soft text-violet-deep rounded-[var(--radius-sm)] px-3 py-2.5"
            >
              <Icon
                name={note.icon ?? "note"}
                size={14}
                className="shrink-0 mt-[2px]"
              />
              <div className="min-w-0">
                <div className="text-eyebrow">{note.label}</div>
                <p className="text-[13px] leading-snug mt-1 text-ink">
                  {note.text}
                </p>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
