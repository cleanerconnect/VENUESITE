"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Send, Sparkles, X } from "lucide-react";
import { useAssistantStore } from "@/lib/stores/assistant";
import {
  mockResponse,
  makeStream,
  SUGGESTED_PROMPTS,
} from "@/lib/ai/static/assistant";
import { cn } from "@/lib/utils/cn";

// Persistent AI assistant. Three surfaces share one component:
// - Desktop: bottom-left FAB → chat panel anchored bottom-left, 420×640
// - Mobile: chat opens as a bottom-up Radix sheet (full screen)
// All three respond via mockResponse() + makeStream() to simulate the
// token-by-token typing feel. Real API later: swap the streamer.

// Position the FAB in the MAIN CONTENT area's bottom-left, not the
// viewport's bottom-left, so it sits clear of the sidebar's user card.
// 260px sidebar + 24px breathing gap = the left offset.
// Tailwind v4's arbitrary-class JIT does support calc(), but we set it via
// `style` so the value stays explicit and easy to grep.
const FAB_LEFT = "calc(260px + 24px)";

export function AssistantFAB() {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  return (
    <>
      {/* Desktop FAB only, anchored to the main content area's bottom-left */}
      <motion.button
        onClick={() => setOpen(true)}
        title="Assistant LYFE, ⌘ + J"
        aria-label="Ouvrir l'assistant LYFE"
        style={{ left: FAB_LEFT }}
        className={cn(
          "hidden md:inline-flex fixed bottom-6 z-30 h-14 w-14 rounded-full",
          "bg-violet-soft text-violet-deep items-center justify-center",
          "shadow-lift hover:shadow-deep transition-shadow",
          "ring-1 ring-violet/30",
        )}
        animate={
          open
            ? { scale: 0, opacity: 0 }
            : {
                scale: [1, 1.02, 1],
                opacity: 1,
              }
        }
        transition={
          open
            ? { duration: 0.22 }
            : {
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
                repeat: Infinity,
                repeatDelay: 7.4,
              }
        }
      >
        <Sparkles size={22} strokeWidth={1.8} />
      </motion.button>
      <AssistantPanel />
    </>
  );
}

function AssistantPanel() {
  const { open, setOpen, messages, pushUser, pushAssistant, appendToAssistant, finishAssistant } =
    useAssistantStore();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Talks to /api/assistant, which streams Server-Sent Events. The key,
  // the system prompt and the model all stay server-side; this component
  // only knows how to append text deltas — the same thing it did against
  // the canned generator, so the typing UI is unchanged.
  //
  // On any failure it falls back to the local mock rather than leaving an
  // empty bubble: an assistant that answers from stale canned text is a
  // better failure than one that silently does nothing.
  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt) return;

    pushUser(prompt);
    setInput("");
    const id = pushAssistant();

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok || !response.body) throw new Error("assistant failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;

        // SSE frames are newline-delimited but arrive on arbitrary chunk
        // boundaries — hold the partial tail until its terminator lands.
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              text?: string;
              error?: string;
            };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) appendToAssistant(id, parsed.text);
          } catch {
            // A malformed frame is not worth dropping the whole reply.
          }
        }
      }
      finishAssistant(id);
    } catch {
      const stream = makeStream(mockResponse(prompt));
      const tick = () => {
        const { chunk, done } = stream();
        if (chunk) appendToAssistant(id, chunk);
        if (done) {
          finishAssistant(id);
          return;
        }
        setTimeout(tick, 28);
      };
      tick();
    }
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="md:hidden fixed inset-0 z-[55] bg-ink/40 backdrop-blur-sm"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "fixed z-[60] bg-surface flex flex-col overflow-hidden",
                  // Mobile: full-screen sheet from the bottom
                  "inset-x-0 bottom-0 top-[10%] rounded-t-[var(--radius-xl)]",
                  // Desktop: anchored to main-content bottom-left so the
                  // panel opens up-and-right from the FAB origin and never
                  // overlaps the sidebar. left offset matches the FAB.
                  "md:inset-auto md:bottom-6 md:top-auto md:right-auto",
                  "md:left-[calc(260px+24px)]",
                  "md:w-[420px] md:max-h-[640px] md:rounded-[var(--radius-xl)]",
                  "md:shadow-deep md:ring-1 md:ring-violet/15",
                )}
              >
                <RadixDialog.Title className="sr-only">
                  Assistant LYFE
                </RadixDialog.Title>
                <header className="px-5 h-[60px] border-b border-line-soft flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="h-9 w-9 rounded-full bg-violet-soft flex items-center justify-center"
                    >
                      <Sparkles size={16} strokeWidth={1.8} className="text-violet-deep" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-[14px] font-bold text-ink">
                        Assistant LYFE
                      </div>
                      <div className="text-meta text-ink-mute">
                        Toujours en train d'apprendre vos événements
                      </div>
                    </div>
                  </div>
                  <RadixDialog.Close
                    aria-label="Fermer"
                    className="h-9 w-9 -mr-2 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute"
                  >
                    <X size={16} strokeWidth={1.8} />
                  </RadixDialog.Close>
                </header>

                {/* Thread */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto scroll-thin px-5 py-5"
                >
                  {messages.length === 0 ? (
                    <FirstOpenState onPick={send} />
                  ) : (
                    <ul className="flex flex-col gap-4">
                      {messages.map((m) => (
                        <li key={m.id}>
                          {m.role === "user" ? (
                            <div className="ml-auto bg-canvas-2 text-ink rounded-[var(--radius-md)] rounded-br-[6px] px-3.5 py-2.5 max-w-[85%] text-[13px] w-fit">
                              {m.content}
                            </div>
                          ) : (
                            <div className="flex gap-2.5">
                              <span
                                aria-hidden
                                className="h-5 w-5 rounded-full bg-violet-soft flex items-center justify-center shrink-0 mt-0.5"
                              >
                                <Sparkles
                                  size={10}
                                  strokeWidth={2}
                                  className="text-violet-deep"
                                />
                              </span>
                              <div className="flex-1 text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
                                {m.content}
                                {m.streaming ? (
                                  <span
                                    aria-hidden
                                    className="inline-block w-1.5 h-3.5 bg-violet ml-0.5 -mb-0.5 animate-pulse"
                                  />
                                ) : null}
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="border-t border-line-soft p-3 flex items-center gap-2 shrink-0"
                >
                  <input
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Demandez ce que vous voulez…"
                    className="flex-1 h-11 px-3.5 bg-canvas-2/50 border border-line rounded-full text-[14px] outline-none focus:border-ink transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Envoyer"
                    className="h-11 w-11 rounded-full bg-violet text-canvas flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-violet-deep transition-colors"
                  >
                    <Send size={16} strokeWidth={1.8} />
                  </button>
                </form>
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

function FirstOpenState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div>
      <div className="text-[13px] text-ink-soft leading-relaxed">
        Posez n'importe quelle question sur vos événements, vos ventes ou
        vos clients. Quelques exemples pour commencer :
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="text-left px-3.5 py-2.5 bg-violet-soft text-violet-deep rounded-[var(--radius-sm)] text-[13px] font-medium hover:bg-violet hover:text-canvas transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
