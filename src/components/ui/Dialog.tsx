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
  const widthClass = size === "lg" ? "max-w-xl" : "max-w-md";

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
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)]",
                  "bg-surface rounded-[var(--radius-xl)] shadow-deep border border-line",
                  widthClass,
                )}
              >
                <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
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
                  <div className="px-6 py-4 border-t border-line-soft bg-canvas-2/40 rounded-b-[var(--radius-xl)] flex justify-end gap-2">
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
