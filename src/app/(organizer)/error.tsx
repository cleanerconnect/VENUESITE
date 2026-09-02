"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Workspace-wide error boundary.
//
// The repository throws a typed `RepositoryError` rather than returning
// an empty payload — an unseeded database or an unreachable backend is
// an operator error, not a UI state. This is where that surfaces: one
// honest message and a retry, instead of a blank dashboard the partner
// would read as "no bookings today".
//
// The digest is shown deliberately. It is the only handle a partner can
// give support, and it leaks nothing.
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with the real telemetry sink at integration.
    console.error("[workspace]", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-12">
      <Card variant="surface" size="lg">
        <span
          aria-hidden
          className="h-11 w-11 rounded-[14px] bg-tint-rose flex items-center justify-center"
        >
          <AlertTriangle size={20} strokeWidth={1.8} className="text-danger" />
        </span>
        <h1 className="text-h2 text-ink mt-5">Cette page n'a pas pu charger</h1>
        <p className="text-body text-ink-soft mt-2">
          {error.message ||
            "Une erreur est survenue en récupérant vos données. Réessayez dans un instant."}
        </p>
        {error.digest ? (
          <p className="text-meta text-ink-mute mt-3 num">
            Référence · {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={reset} iconLeft={<RotateCw size={16} strokeWidth={2} />}>
            Réessayer
          </Button>
        </div>
      </Card>
    </div>
  );
}
