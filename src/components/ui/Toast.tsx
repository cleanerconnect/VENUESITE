"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { Check, X, Undo2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface ToastEntry {
  id: number;
  title: string;
  description?: string;
  tone: "success" | "info" | "danger";
  undo?: () => void;
}

interface ToastContext {
  toast: (entry: Omit<ToastEntry, "id">) => void;
}

const Ctx = createContext<ToastContext | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast() must be used inside <ToastProvider>");
  return ctx;
}

let counter = 0;

// Toast provider, wraps the root layout. Optimistic actions throw their
// confirmation (and optional undo) here.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastEntry[]>([]);

  const toast = useCallback((entry: Omit<ToastEntry, "id">) => {
    const id = ++counter;
    setItems((prev) => [...prev, { ...entry, id }]);
  }, []);

  const remove = (id: number) =>
    setItems((prev) => prev.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        <AnimatePresence>
          {items.map((t) => (
            <RadixToast.Root
              key={t.id}
              duration={4500}
              onOpenChange={(open) => !open && remove(t.id)}
              asChild
              forceMount
            >
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3 bg-ink text-canvas rounded-[var(--radius-md)] p-4 shadow-deep min-w-[280px] max-w-md"
              >
                <span
                  aria-hidden
                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background:
                      t.tone === "success"
                        ? "color-mix(in oklab, var(--color-success) 32%, transparent)"
                        : t.tone === "danger"
                          ? "color-mix(in oklab, var(--color-danger) 32%, transparent)"
                          : "color-mix(in oklab, var(--color-violet) 28%, transparent)",
                  }}
                >
                  {t.tone === "danger" ? (
                    <X size={14} strokeWidth={2} />
                  ) : (
                    <Check size={14} strokeWidth={2} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <RadixToast.Title className="text-[13px] font-semibold">
                    {t.title}
                  </RadixToast.Title>
                  {t.description ? (
                    <RadixToast.Description className="text-meta text-canvas/70 mt-0.5">
                      {t.description}
                    </RadixToast.Description>
                  ) : null}
                </div>
                {t.undo ? (
                  <RadixToast.Action
                    altText="Annuler"
                    onClick={t.undo}
                    className="text-[12px] font-bold text-violet flex items-center gap-1 hover:underline shrink-0"
                  >
                    <Undo2 size={12} strokeWidth={2} />
                    Annuler
                  </RadixToast.Action>
                ) : (
                  <RadixToast.Close
                    aria-label="Fermer"
                    className="text-canvas/60 hover:text-canvas shrink-0"
                  >
                    <X size={14} strokeWidth={1.8} />
                  </RadixToast.Close>
                )}
              </motion.div>
            </RadixToast.Root>
          ))}
        </AnimatePresence>
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 p-0 outline-none md:bottom-6 md:right-6 max-w-[calc(100vw-2rem)]" />
      </RadixToast.Provider>
    </Ctx.Provider>
  );
}
