import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/dashboard/primitives";
import { COPY } from "@/lib/copy/fr";

// A venue screen that could not load.
//
// Reached two ways — a real failure, or `?etat=erreur` — and
// deliberately the same component for both, so the state a reviewer
// forces is the state a partner would actually see.
//
// It says what happened, offers the one action that ever helps
// (reload), and names the reference so a support message can carry
// something more useful than "ça marche pas".
export function ScreenError({ reference }: { reference?: string }) {
  return (
    <Card variant="surface" size="lg">
      <div className="py-8 text-center max-w-[44ch] mx-auto">
        <span
          aria-hidden
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose"
        >
          <Icon name="alert" size={20} strokeWidth={1.8} className="text-ink" />
        </span>
        <h1 className="text-h2 text-ink mt-4">{COPY.error.title}</h1>
        <p className="text-body text-ink-soft mt-2">{COPY.error.body}</p>

        {reference ? (
          <p className="text-meta text-ink-mute mt-3 num">
            {COPY.error.reference} : {reference}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/restaurant"
            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-ink px-4 text-[13px] font-semibold text-canvas hover:bg-ink-soft transition-colors"
          >
            Revenir à l'accueil
          </Link>
          <Link
            href="/restaurant/support"
            className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-line bg-surface px-4 text-[13px] font-semibold text-ink hover:border-ink transition-colors"
          >
            Contacter le support
          </Link>
        </div>
      </div>
    </Card>
  );
}
