"use client";

// What a screen shows when its data is not there.
//
// One component for all three non-happy outcomes, so loading, empty and
// failed look the same everywhere instead of being reinvented per screen
// — which is how the portal ended up with no states at all on some
// routes and a bare string on others.
//
// Presentational: it takes a query result and slots, imports nothing
// from the data layer, and renders in the styleguide from literals.

import type { ReactNode } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { COPY } from "@/lib/copy/fr";
import type { Query } from "@/lib/data/useQuery";

export function QueryState({
  query,
  /** Shown while loading. Give it a skeleton that matches what follows. */
  skeleton,
  /** Title and body for the empty case. */
  empty,
  /** Announced to screen readers while the region is busy. */
  label = COPY.loading.generic,
}: {
  query: Pick<Query<unknown>, "status" | "error" | "isEmpty" | "retry">;
  skeleton: ReactNode;
  empty?: { title: string; body?: string; action?: ReactNode };
  label?: string;
}) {
  if (query.status === "loading") {
    return (
      <div role="status" aria-live="polite" aria-busy>
        <span className="sr-only">{label}</span>
        {skeleton}
      </div>
    );
  }

  if (query.status === "error") {
    return <QueryError error={query.error} onRetry={query.retry} />;
  }

  if (query.isEmpty && empty) {
    return (
      <EmptyState
        title={empty.title}
        description={empty.body}
      />
    );
  }

  return null;
}

/**
 * The failed-load card. Separate export because a few surfaces (a chart
 * inside a tab, a drawer body) want the error without the loading and
 * empty branches around it.
 */
export function QueryError({
  error,
  onRetry,
  compact = false,
}: {
  error: Error | null;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <Card variant="surface" size={compact ? "sm" : "md"} role="alert">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="h-9 w-9 rounded-chip bg-tint-rose flex items-center justify-center shrink-0"
        >
          <TriangleAlert size={16} strokeWidth={1.8} className="text-danger" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">
            {COPY.error.loadFailed}
          </p>
          <p className="text-meta text-ink-soft mt-1">
            {error?.message || COPY.error.body}
          </p>
          {onRetry ? (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={onRetry}
              iconLeft={<RotateCw size={14} strokeWidth={2} />}
            >
              {COPY.action.retry}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/**
 * What someone sees when their role does not carry a capability.
 *
 * Distinct from empty and from error on purpose: nothing is missing and
 * nothing broke. Saying which role would grant access is deliberate —
 * "contact your owner" is actionable, "access denied" is not.
 */
export function PermissionDenied({
  what,
  requiredRole,
}: {
  /** What they tried to open, e.g. "les réglages du lieu". */
  what: string;
  /** Who can, e.g. "un propriétaire ou un gérant". */
  requiredRole?: string;
}) {
  return (
    <Card variant="canvas-2" size="lg" role="alert">
      <div className="max-w-md">
        <span
          aria-hidden
          className="h-10 w-10 rounded-chip bg-surface flex items-center justify-center"
        >
          <TriangleAlert size={18} strokeWidth={1.8} className="text-ink-mute" />
        </span>
        <h2 className="text-h3 text-ink mt-4">{COPY.error.deniedTitle}</h2>
        <p className="text-body text-ink-soft mt-2">
          Votre rôle ne donne pas accès à {what}.
          {requiredRole ? ` Demandez à ${requiredRole} de vous l'ouvrir.` : ""}
        </p>
      </div>
    </Card>
  );
}
