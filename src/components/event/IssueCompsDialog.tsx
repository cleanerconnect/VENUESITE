"use client";

import { useState } from "react";
import { Mail, Send, Sparkles, X } from "lucide-react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import {
  COMP_CATEGORY_LABEL,
  type CompCategory,
} from "@/lib/types/comps";

const CATEGORY_OPTIONS: CompCategory[] = [
  "press",
  "sponsors",
  "talent",
  "staff",
  "contest",
];

interface DraftComp {
  category: CompCategory;
  recipientName: string;
  recipientEmail: string;
  organization: string;
  ticketCount: number;
  notes: string;
}

const INITIAL: DraftComp = {
  category: "press",
  recipientName: "",
  recipientEmail: "",
  organization: "",
  ticketCount: 2,
  notes: "",
};

export function IssueCompsDialog({
  open,
  onOpenChange,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  defaultCategory?: CompCategory;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<DraftComp>(() => ({
    ...INITIAL,
    category: defaultCategory ?? INITIAL.category,
  }));

  const set = <K extends keyof DraftComp>(key: K, value: DraftComp[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const reset = () =>
    setState({ ...INITIAL, category: defaultCategory ?? INITIAL.category });

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const valid =
    state.recipientName.trim().length > 1 &&
    state.recipientEmail.includes("@") &&
    state.ticketCount > 0;

  const submit = () => {
    toast({
      tone: "success",
      title: `Invitation envoyée à ${state.recipientName}`,
      description: `${state.ticketCount} place${state.ticketCount > 1 ? "s" : ""} · ${COMP_CATEGORY_LABEL[state.category]}`,
    });
    handleClose(false);
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={handleClose}>
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
                initial={{ opacity: 0, y: "8%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "12%" }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="fixed z-50 bg-surface shadow-deep border border-line
                  inset-x-0 bottom-0 w-full rounded-t-[var(--radius-xl)]
                  max-h-[92vh] overflow-hidden
                  md:left-1/2 md:top-1/2 md:right-auto md:bottom-auto
                  md:-translate-x-1/2 md:-translate-y-1/2
                  md:w-[560px] md:max-w-[92vw] md:rounded-[var(--radius-xl)] md:max-h-[88vh]
                  flex flex-col"
              >
                <header className="flex items-start gap-3 p-6 border-b border-line-soft">
                  <span
                    aria-hidden
                    className="h-10 w-10 rounded-chip bg-violet-soft flex items-center justify-center shrink-0"
                  >
                    <Mail
                      size={18}
                      strokeWidth={1.7}
                      className="text-violet-deep"
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <RadixDialog.Title asChild>
                      <h2
                        className="text-ink"
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontWeight: 600,
                          fontSize: "20px",
                          lineHeight: 1.15,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        Émettre une invitation
                      </h2>
                    </RadixDialog.Title>
                    <RadixDialog.Description asChild>
                      <p className="text-meta text-ink-soft mt-1">
                        Génère un lien comp unique envoyé par email.
                      </p>
                    </RadixDialog.Description>
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

                <div className="flex-1 overflow-y-auto scroll-thin p-6 space-y-5">
                  {/* Category picker */}
                  <div>
                    <div className="text-eyebrow text-ink-mute mb-2">
                      Catégorie
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CATEGORY_OPTIONS.map((cat) => {
                        const active = state.category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => set("category", cat)}
                            className={cn(
                              "text-left rounded-[var(--radius-md)] border px-3 py-2 transition-colors",
                              active
                                ? "border-violet bg-violet-soft"
                                : "border-line bg-surface hover:border-violet-soft",
                            )}
                          >
                            <div className="text-[12.5px] font-semibold text-ink leading-tight">
                              {COMP_CATEGORY_LABEL[cat]}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nom du destinataire"
                      value={state.recipientName}
                      onChange={(e) => set("recipientName", e.target.value)}
                      placeholder="Ex. Camille Moreau"
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={state.recipientEmail}
                      onChange={(e) => set("recipientEmail", e.target.value)}
                      placeholder="camille@lemonde.fr"
                      autoComplete="email"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
                    <Input
                      label="Organisation"
                      value={state.organization}
                      onChange={(e) => set("organization", e.target.value)}
                      placeholder="Ex. Le Monde Afrique"
                    />
                    <Input
                      label="Places"
                      type="number"
                      min={1}
                      max={20}
                      value={state.ticketCount}
                      onChange={(e) =>
                        set("ticketCount", Number(e.target.value))
                      }
                    />
                  </div>

                  <div>
                    <div className="text-eyebrow text-ink-mute mb-2">
                      Note (optionnelle)
                    </div>
                    <textarea
                      value={state.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      rows={3}
                      placeholder="Brief, contexte presse, accès backstage…"
                      className="w-full px-3 py-2.5 bg-surface border border-line rounded-[var(--radius-sm)] text-[14px] focus:outline-none focus:border-ink transition-colors resize-none"
                    />
                  </div>

                  <div className="rounded-[var(--radius-md)] bg-canvas-2 border-l-2 border-violet p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles
                        size={13}
                        strokeWidth={1.8}
                        className="text-violet-deep mt-0.5 shrink-0"
                      />
                      <p className="text-meta text-ink leading-relaxed">
                        Un lien unique sera généré et envoyé par email. Le
                        destinataire pourra accéder à ses places jusqu&apos;à
                        24h avant l&apos;événement.
                      </p>
                    </div>
                  </div>
                </div>

                <footer className="border-t border-line-soft p-4 flex items-center justify-end gap-3">
                  <RadixDialog.Close asChild>
                    <Button variant="ghost" size="md">
                      Annuler
                    </Button>
                  </RadixDialog.Close>
                  <Button
                    size="md"
                    iconLeft={<Send size={14} strokeWidth={1.8} />}
                    onClick={submit}
                    disabled={!valid}
                  >
                    Envoyer l&apos;invitation
                  </Button>
                </footer>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
