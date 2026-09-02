"use client";

import { useCallback } from "react";
import { useAssistantStore } from "@/lib/stores/assistant";
import { useCheckInStore } from "@/lib/stores/checkin";
import { useScannerStore } from "@/lib/stores/scanner";

// Chrome commands.
//
// A nav entry — a topbar quick action, a raised phone tab — names a
// command instead of carrying a handler, so `workspaces.ts` stays plain
// data and a new workspace does not have to be a client module.
//
// This is the one place those names resolve. The topbar and the bottom
// tabs both used to keep their own inline `if (command === …)` chain;
// they had already diverged on what an unknown command should do.
const NOOP = () => {};

export function useChromeCommand() {
  const openScanner = useScannerStore((s) => s.setOpen);
  const openCheckIn = useCheckInStore((s) => s.setOpen);
  const openAssistant = useAssistantStore((s) => s.setOpen);

  return useCallback(
    (command: string | undefined) => {
      switch (command) {
        case "scanner.open":
          return openScanner(true);
        case "checkin.open":
          return openCheckIn(true);
        case "assistant.open":
          return openAssistant(true);
        default:
          // An unknown command is a bug in the workspace registry, not a
          // reason to open something arbitrary.
          if (command) console.warn(`[chrome] unknown command: ${command}`);
          return NOOP();
      }
    },
    [openScanner, openCheckIn, openAssistant],
  );
}
