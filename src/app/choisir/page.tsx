import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveSession } from "@/lib/auth/server-session";
import { resolveAccount } from "@/lib/auth/accounts";
import { CHOOSER_LINE, dashboardsFor } from "@/lib/nav/dashboards";
import { Brand } from "@/components/organizer/Brand";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/button-style";
import { resolveIcon } from "@/lib/dashboard/icons";
import { cn } from "@/lib/utils/cn";

// « Que voulez-vous gérer sur LYFE ? » — DigiNegoce, 27 October.
//
// The screen between an account and a dashboard. It exists because a
// LYFE account is a person rather than a restaurant: the same person
// can hold a table, a rooftop and a season of events, and the sign-in
// that used to resolve all of that into one destination had to guess —
// events if you held an organisation, your venue otherwise, and an
// account holding both never learned that it did.
//
// Outside `(organizer)`: there is no dashboard around this screen,
// because picking one is what it is for. A sidebar here would have to
// show the navigation of a product the partner has not chosen yet.
//
// Three cards, always three. A space the account holds reads
// « Actif · ouvrir » and the whole card opens it; one it does not
// carries a primary « Ajouter » button that starts the flow which
// creates it. The alternative — hiding what you do not have — is a
// screen that cannot tell a partner the bar space exists, which is the
// one thing it is in a position to do.
//
// It is also the **switcher**: the identity card in both sidebars opens
// it. So it renders every time it is opened, and only the sign-in ever
// skips it — see `destinationFor`.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choisir un espace · LYFE" };

export default async function ChoisirPage() {
  const session = await resolveSession();
  if (!session) redirect("/login");

  const account = await resolveAccount(session.userId);
  if (!account) redirect("/login?expired=1");

  // **No redirect.** This screen used to send an account holding one
  // space straight to it, which made it impossible to open on purpose:
  // the sidebar card leads here, and a partner who came looking for the
  // bar card was bounced to their carnet before the page painted. The
  // skip belongs to the sign-in, happens once, and lives in
  // `destinationFor`.
  const cards = dashboardsFor(account);

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto w-full max-w-[720px]">
        <span className="md:hidden">
          <Brand size="sm" />
        </span>
        <span className="hidden md:block">
          <Brand size="lg" />
        </span>

        <h1 className="text-h2 text-ink mt-6 md:mt-8">
          Que voulez-vous gérer sur LYFE&nbsp;?
        </h1>
        {/* No first name.
            « Rachid, un espace par activité » greets a partner who is
            here to switch spaces for the fourth time today, and the
            screen is the switcher now rather than the first thing a new
            account sees. The sentence says what the screen is for and
            stops. */}
        <p className="text-body text-ink-soft mt-2">
          {CHOOSER_LINE}
        </p>

        <div className="mt-6 flex flex-col gap-3 md:mt-8">
          {cards.map((card) => {
            const Glyph = resolveIcon(card.icon);
            const face = (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-chip",
                    card.active ? "bg-violet-soft text-ink" : "bg-canvas-2 text-ink-soft",
                  )}
                >
                  {Glyph ? <Glyph size={20} strokeWidth={2} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-ink">
                    {card.label}
                  </span>
                  <span className="block text-meta text-ink-soft mt-0.5">
                    {card.line}
                  </span>
                </span>
              </>
            );

            // A space already held: the whole card is the target, and
            // « Actif · ouvrir » is a word rather than a button —
            // a button inside a link is two things to press for one
            // destination.
            if (card.active) {
              return (
                <Link key={card.id} href={card.href} className="block">
                  <Card
                    variant="surface"
                    size="md"
                    className="flex items-center gap-4 border-ink/20 transition-colors hover:border-ink/40"
                  >
                    {face}
                    <span
                      className="text-meta font-semibold shrink-0 text-success"
                      data-dashboard={card.id}
                      data-active="1"
                    >
                      {card.action}
                    </span>
                  </Card>
                </Link>
              );
            }

            // A space to add: the card is not a link, and the primary
            // button is the thing you press. Adding a space is a
            // commitment — six steps for a venue, four for an
            // organisation — and it earns a button that looks like one
            // rather than a word that happens to be clickable.
            return (
              <Card
                key={card.id}
                variant="surface"
                size="md"
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="flex min-w-0 flex-1 items-center gap-4">
                  {face}
                </span>
                <Link
                  href={card.href}
                  className={cn(buttonClass("primary", "md"), "shrink-0 max-sm:w-full")}
                >
                  {/* The marker sits on the word in both states — on a
                      span inside the link here, on a span inside the
                      card above — so one selector reads the action
                      whichever shape the card took, and the thing a
                      tool clicks is the link either way. */}
                  <span data-dashboard={card.id} data-active="0">
                    {card.action}
                  </span>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
