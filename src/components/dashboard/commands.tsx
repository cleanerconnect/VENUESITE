"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useScannerStore } from "@/lib/stores/scanner";
import { useAssistantStore } from "@/lib/stores/assistant";
import { useToast } from "@/components/ui/Toast";

// Command registry.
//
// A spec is JSON, so a button can't carry an onClick. It carries a
// command *name* instead, and this resolves the name to a handler at
// render time. Two consequences worth stating:
//
//   · the surface of what a spec can trigger is a closed list defined
//     here, not "whatever the payload says" — an API response cannot
//     invent new behaviour
//   · a screen can be re-ordered or shipped from the backend without
//     rebuilding the client, because the verbs already exist
//
// `register` lets a route add screen-local verbs (open this drawer,
// filter this list) without touching the global set.

export type CommandPayload = Record<string, string | number | boolean>;
export type CommandHandler = (payload?: CommandPayload) => void;
export type CommandRunner = (name: string, payload?: CommandPayload) => void;

const CommandContext = createContext<CommandRunner | null>(null);

export function CommandProvider({
  register,
  children,
}: {
  /** Screen-local handlers, merged over the globals. */
  register?: Record<string, CommandHandler>;
  children: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const openScanner = useScannerStore((s) => s.setOpen);
  const openAssistant = useAssistantStore((s) => s.setOpen);

  const globals = useMemo<Record<string, CommandHandler>>(
    () => ({
      "scanner.open": () => openScanner(true),
      "assistant.open": () => openAssistant(true),
      "assistant.ask": () => openAssistant(true),
      "route.push": (payload) => {
        const href = payload?.href;
        if (typeof href === "string") router.push(href);
      },
      "route.refresh": () => router.refresh(),
      "print": () => {
        if (typeof window !== "undefined") window.print();
      },
    }),
    [openAssistant, openScanner, router],
  );

  const run = useCallback<CommandRunner>(
    (name, payload) => {
      const handler = register?.[name] ?? globals[name];
      if (!handler) {
        // Unknown verb is a data problem, not a crash. Surface it the way
        // the rest of the app surfaces demo gaps.
        toast({ tone: "info", title: "Action non disponible" });
        return;
      }
      handler(payload);
    },
    [globals, register, toast],
  );

  return (
    <CommandContext.Provider value={run}>{children}</CommandContext.Provider>
  );
}

/**
 * Outside a provider the runner is a no-op rather than a throw — a block
 * rendered in isolation (a test, a storybook cell) should still paint.
 */
export function useCommandRunner(): CommandRunner {
  const ctx = useContext(CommandContext);
  return ctx ?? noop;
}

const noop: CommandRunner = () => {};
