"use client";

import { X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// Modal dialog, Radix wired, custom motion. Use for confirmations, the
// invite-member flow, the OTP gate, the wizard submit confirmation.
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const widthClass = size === "lg" ? "md:max-w-xl" : "md:max-w-md";

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
              {/* Renders as a bottom sheet on mobile (<768px) and a centered
                  modal on tablet+. Two motion variants on desktop, slide-up
                  on mobile. */}
              <motion.div
                initial={{ opacity: 0, y: "8%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "12%" }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  // Mobile: bottom-anchored sheet, full width, rounded top.
                  "fixed z-50 bg-surface shadow-deep border border-line",
                  "left-0 right-0 bottom-0 w-full rounded-t-[var(--radius-xl)] rounded-b-none",
                  "max-h-[92vh] overflow-y-auto",
                  // Desktop: centered modal with the sized width and full corners.
                  "md:left-1/2 md:top-1/2 md:right-auto md:bottom-auto",
                  "md:-translate-x-1/2 md:-translate-y-1/2",
                  "md:w-[calc(100%-2rem)] md:rounded-[var(--radius-xl)]",
                  "md:max-h-[90vh] md:overflow-visible",
                  widthClass,
                )}
              >
                {/* Mobile-only drag handle for sheet affordance. */}
                <div
                  aria-hidden
                  className="md:hidden flex justify-center pt-3"
                >
                  <span className="h-1 w-10 rounded-full bg-line" />
                </div>
                <div className="flex items-start justify-between gap-4 px-6 pt-4 md:pt-6 pb-3">
                  <div>
                    <RadixDialog.Title className="text-h3 text-ink">
                      {title}
                    </RadixDialog.Title>
                    {description ? (
                      <RadixDialog.Description className="text-meta text-ink-soft mt-1.5">
                        {description}
                      </RadixDialog.Description>
                    ) : null}
                  </div>
                  <RadixDialog.Close
                    aria-label="Fermer"
                    className="h-8 w-8 -mr-2 -mt-2 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute"
                  >
                    <X size={16} strokeWidth={1.8} />
                  </RadixDialog.Close>
                </div>
                <div className="px-6 py-4">{children}</div>
                {footer ? (
                  <div className="px-6 py-4 border-t border-line-soft bg-canvas-2/40 md:rounded-b-[var(--radius-xl)] flex justify-end gap-2 sticky bottom-0 md:static">
                    {footer}
                  </div>
                ) : null}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
