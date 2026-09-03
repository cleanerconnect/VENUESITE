import { Suspense } from "react";
import type { Metadata } from "next";
import { Brand } from "@/components/organizer/Brand";
import { Card } from "@/components/ui/Card";
import { demoAccounts } from "@/lib/auth/accounts";
import { SignInPanel } from "./SignInPanel";

// The entry point.
//
// A partner arrives here from the Org button on lyfemaroc.org. One form,
// one set of credentials; where they land is resolved from the account,
// not from which link they followed.
//
// Server component: the demo account list is read here and passed down,
// so the client bundle never carries the account directory.

export const metadata: Metadata = { title: "Connexion · LYFE" };

export default function LoginPage() {
  const accounts = demoAccounts();

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* === Left column — editorial identity === */}
      <section className="bg-canvas flex flex-col justify-between p-6 md:p-12 lg:p-16 md:basis-3/5 md:flex-shrink-0">
        <div>
          <Brand height={52} />

          <div className="mt-10 md:mt-16 text-eyebrow text-ink-mute">
            Espace partenaire
          </div>
          <h1
            className="text-ink mt-3 max-w-[14ch]"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "clamp(36px, 5.4vw, 64px)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
            }}
          >
            Le système d&apos;exploitation de vos soirées.
          </h1>
          <p className="text-body text-ink-soft mt-5 max-w-md leading-relaxed hidden md:block">
            Billetterie, réservations, audience, paiements et analyses — sur
            la même plateforme. Pour les festivals, les salles, les
            restaurants et les bars au Maroc.
          </p>
        </div>

        <div className="hidden md:block mt-10">
          <div className="grid grid-cols-3 gap-3 max-w-2xl">
            <StatTile number="+45 000" label="personnes touchées" />
            <StatTile number="12" label="villes au Maroc" />
            <StatTile number="J+3" label="versement garanti" />
          </div>

          <blockquote className="mt-10 max-w-md">
            <p
              className="text-ink-mute leading-relaxed"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "17px",
                lineHeight: 1.5,
              }}
            >
              &laquo; LYFE nous a permis de gérer la billetterie de notre 19e
              édition sans friction. &raquo;
            </p>
            <footer className="text-meta text-ink-soft mt-2">
              — Équipe Jazzablanca
            </footer>
          </blockquote>
        </div>
      </section>

      {/* === Right column — the one form === */}
      <section className="bg-surface flex items-center justify-center p-6 md:p-12 md:basis-2/5 md:flex-1 border-t md:border-t-0 md:border-l border-line-soft min-h-[60vh] md:min-h-screen">
        {/* The panel reads `?expired=1`, so it needs a boundary for the
            static shell to render around. */}
        <Suspense fallback={<div className="w-full max-w-[400px] h-[420px]" />}>
          <SignInPanel demoAccounts={accounts} />
        </Suspense>
      </section>
    </main>
  );
}

function StatTile({ number, label }: { number: string; label: string }) {
  return (
    <Card variant="violet-soft" size="sm" className="text-center">
      <div
        className="text-violet-deep num"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(20px, 2vw, 26px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {number}
      </div>
      <div className="text-meta text-ink-soft mt-1.5 leading-tight">
        {label}
      </div>
    </Card>
  );
}
