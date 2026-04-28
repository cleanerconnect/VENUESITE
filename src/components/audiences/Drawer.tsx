"use client";

import { X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";

// Right-anchored drawer on desktop, bottom sheet on mobile. Used by
// the segment detail panel and the buyer profile sheet on /audiences.
//
// Closes on X click, ESC key, click outside (Radix wires all three by
// default via onOpenChange).
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
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
                // Desktop right drawer: slides from the right edge, fixed
                // 460px wide. Mobile bottom sheet: slides up from below.
                initial={{ opacity: 0, x: "8%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "8%" }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="fixed z-50 bg-surface shadow-deep border border-line
                  inset-x-0 bottom-0 w-full rounded-t-[var(--radius-xl)] max-h-[88vh] overflow-hidden
                  md:inset-x-auto md:bottom-0 md:top-0 md:right-0 md:w-[460px] md:max-w-[92vw]
                  md:rounded-t-none md:rounded-l-[var(--radius-xl)] md:max-h-screen flex flex-col"
              >
                <header className="flex items-start gap-3 p-6 border-b border-line-soft">
                  <div className="flex-1 min-w-0">
                    <RadixDialog.Title asChild>
                      <h2
                        className="text-ink"
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontWeight: 600,
                          fontSize: "22px",
                          lineHeight: 1.15,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {title}
                      </h2>
                    </RadixDialog.Title>
                    {description ? (
                      <RadixDialog.Description asChild>
                        <p className="text-meta text-ink-soft mt-1.5 leading-relaxed">
                          {description}
                        </p>
                      </RadixDialog.Description>
                    ) : null}
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
                  <footer className="border-t border-line-soft p-4 bg-canvas-2 sticky bottom-0">
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
