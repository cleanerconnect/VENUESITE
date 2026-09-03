"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ScreenSpec } from "@/lib/dashboard/spec";
import type { CommandHandler } from "@/components/dashboard/commands";
import { useToast } from "@/components/ui/Toast";
import { useFormDialog } from "@/lib/stores/form-dialog";
import { SERVER_COMMANDS } from "@/lib/restaurant/commands";
import { runScreenCommand } from "@/app/actions/screen-command";

// The venue's server-backed verbs, as command handlers.
//
// Shared by the workspace screens and the detail routes so a button
// behaves identically wherever it is pressed. A verb with a declared
// form opens it; a verb without one goes straight to the server with the
// button's own payload.
export function useVenueCommands(
  spec: ScreenSpec | null,
): Record<string, CommandHandler> {
  const router = useRouter();
  const { toast } = useToast();
  const openForm = useFormDialog((s) => s.open);

  return useMemo(
    () =>
      Object.fromEntries(
        SERVER_COMMANDS.map((command) => [
          command,
          (payload?: Record<string, string | number | boolean>) => {
            const form = spec?.forms?.[command];
            if (form) {
              openForm(form, payload ?? {});
              return;
            }
            void runScreenCommand(command, payload ?? {}).then((result) => {
              toast({
                tone: result.ok ? "success" : "danger",
                title: result.message ?? (result.ok ? "Enregistré" : "Échec"),
              });
              if (result.ok) router.refresh();
            });
          },
        ]),
      ),
    [openForm, router, spec, toast],
  );
}
