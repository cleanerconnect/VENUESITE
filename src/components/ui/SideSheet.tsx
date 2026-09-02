"use client";

import { X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// The one drawer surface in the portal.
//
// Right-anchored panel on desktop, bottom sheet on phones. Two copies of
// this shell existed — /audiences and the spec renderer — and had already
// drifted on header type and footer treatment. Everything that needs a
// side panel composes this: it owns the surface, the motion and the
// dismiss affordances, and nothing else.
//
// Presentational by construction: it takes `open`, a title, children and
// an optional footer. It reads no store and imports nothing from the
// data layer, so it renders identically in the styleguide and in the app.
//
// Dismisses on the close button, ESC, and click-outside — Radix wires all
// three through `onOpenChange`.
export function SideSheet({
  open,
  onOpenChange,
  title,
  /** Rendered under the title. Also the accessible description. */
  description,
  /** Badges, tabs or anything that belongs under the title block. */
  headerExtra,
  children,
  footer,
  /** `editorial` uses the serif title; `plain` uses the sans H2. */
  titleStyle = "plain",
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  titleStyle?: "plain" | "editorial";
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
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
                className={cn(
                  "fixed z-50 bg-surface shadow-deep border border-line flex flex-col",
                  // Phone: bottom sheet, capped so the page stays visible.
                  "inset-x-0 bottom-0 w-full rounded-t-[var(--radius-xl)] max-h-[88vh] overflow-hidden",
                  // Desktop: full-height right panel.
                  "md:inset-x-auto md:bottom-0 md:top-0 md:right-0 md:w-[460px] md:max-w-[92vw]",
                  "md:rounded-t-none md:rounded-l-[var(--radius-xl)] md:max-h-screen",
                  className,
                )}
              >
                <header className="flex items-start gap-3 p-6 border-b border-line-soft shrink-0">
                  <div className="flex-1 min-w-0">
                    <RadixDialog.Title asChild>
                      {titleStyle === "editorial" ? (
                        <h2 className="font-serif-italic text-ink text-h2 not-italic">
                          {title}
                        </h2>
                      ) : (
                        <h2 className="text-h2 text-ink truncate">{title}</h2>
                      )}
                    </RadixDialog.Title>
                    {description ? (
                      <RadixDialog.Description asChild>
                        <p className="text-meta text-ink-mute mt-1.5 leading-relaxed num">
                          {description}
                        </p>
                      </RadixDialog.Description>
                    ) : null}
                    {headerExtra}
                  </div>
                  <RadixDialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Fermer"
                      className="h-9 w-9 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute shrink-0 transition-colors"
                    >
                      <X size={16} strokeWidth={1.8} />
                    </button>
                  </RadixDialog.Close>
                </header>

                <div className="flex-1 overflow-y-auto scroll-thin p-6">
                  {children}
                </div>

                {footer ? (
                  <footer className="border-t border-line-soft p-4 bg-canvas-2 shrink-0">
                    {footer}
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
