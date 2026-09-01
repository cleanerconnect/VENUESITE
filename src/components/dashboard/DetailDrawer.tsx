"use client";

import { X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { useDetailStore } from "@/lib/stores/detail";
import { ActionControl, Icon, MetricText, SpecBadge } from "./primitives";

// Right drawer on desktop, bottom sheet on phones — the same surface
// /audiences uses, driven by a DetailSpec instead of bespoke children.
//
// Mounted once by the renderer; any row or floor tile in the current
// spec can raise it.
export function DetailDrawer() {
  const spec = useDetailStore((s) => s.spec);
  const close = useDetailStore((s) => s.close);
  const open = spec !== null;

  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => (next ? null : close())}>
      <AnimatePresence>
        {open && spec ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, x: "8%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "8%" }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="fixed z-50 bg-surface shadow-deep border border-line
                  inset-x-0 bottom-0 w-full rounded-t-[var(--radius-xl)] max-h-[88vh] overflow-hidden
                  md:inset-x-auto md:bottom-0 md:top-0 md:right-0 md:w-[460px] md:max-w-[92vw]
                  md:rounded-t-none md:rounded-l-[var(--radius-xl)] md:max-h-screen flex flex-col"
              >
                <header className="flex items-start gap-3 p-6 border-b border-line-soft shrink-0">
                  <div className="flex-1 min-w-0">
                    <RadixDialog.Title asChild>
                      <h2 className="text-h2 text-ink truncate">{spec.title}</h2>
                    </RadixDialog.Title>
                    {spec.subtitle ? (
                      <RadixDialog.Description asChild>
                        <p className="text-meta text-ink-mute mt-1 num">
                          {spec.subtitle}
                        </p>
                      </RadixDialog.Description>
                    ) : null}
                    {spec.badges?.length ? (
                      <div className="flex items-center gap-2 flex-wrap mt-3">
                        {spec.badges.map((badge, i) => (
                          <SpecBadge key={`${badge.label}-${i}`} badge={badge} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <RadixDialog.Close asChild>
                    <button
                      aria-label="Fermer"
                      className="h-9 w-9 rounded-full hover:bg-ink/[0.06] flex items-center justify-center text-ink-mute transition-colors shrink-0"
                    >
                      <X size={16} strokeWidth={1.8} />
                    </button>
                  </RadixDialog.Close>
                </header>

                <div className="flex-1 overflow-y-auto scroll-thin p-6 space-y-7">
                  {spec.sections?.map((section) => (
                    <section key={section.label}>
                      <div className="text-eyebrow text-ink-mute mb-3">
                        {section.label}
                      </div>
                      <dl className="divide-y divide-line-soft">
                        {section.items.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-baseline justify-between gap-4 py-2.5"
                          >
                            <dt className="text-[13.5px] text-ink-soft">
                              {item.label}
                            </dt>
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

                {spec.actions?.length ? (
                  <footer className="p-6 border-t border-line-soft flex items-center gap-3 flex-wrap shrink-0">
                    {spec.actions.map((cta, i) => (
                      <ActionControl
                        key={`${cta.action.label}-${i}`}
                        cta={cta}
                        size="md"
                      />
                    ))}
                  </footer>
                ) : null}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
