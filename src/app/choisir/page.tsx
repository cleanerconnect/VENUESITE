import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveSession } from "@/lib/auth/server-session";
import { resolveAccount } from "@/lib/auth/accounts";
import { dashboardsFor, skipsChooser } from "@/lib/nav/dashboards";
import { Brand } from "@/components/organizer/Brand";
import { Card } from "@/components/ui/Card";
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
// Three cards, always three. A dashboard the account holds reads
// « Actif · ouvrir » and opens; one it does not reads « Ajouter » and
// starts the flow that creates it. The alternative — hiding what you
// do not have — is a screen that cannot tell a partner the bar
// dashboard exists, which is the one thing it is in a position to do.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choisir un espace · LYFE" };

export default async function ChoisirPage() {
  const session = await resolveSession();
  if (!session) redirect("/login");

  const account = await resolveAccount(session.userId);
  if (!account) redirect("/login?expired=1");

  // One dashboard, nothing to choose. The rule the old `destinationFor`
  // was reaching for, now said once and in the open.
  const only = skipsChooser(account);
  if (only) redirect(only.href);

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
        <p className="text-body text-ink-soft mt-2">
          {session.firstName}, un espace par activité. Vous pourrez en ajouter
          d&apos;autres plus tard.
        </p>

        <div className="mt-6 flex flex-col gap-3 md:mt-8">
          {cards.map((card) => {
            const Glyph = resolveIcon(card.icon);
            return (
            <Link key={card.id} href={card.href} className="block">
              <Card
                variant="surface"
                size="md"
                className={cn(
                  "flex items-center gap-4 transition-colors",
                  card.active
                    ? "border-ink/20 hover:border-ink/40"
                    : "hover:border-ink/40",
                )}
              >
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
                {/* The word, not a button: the whole card is the target,
                    and a button inside a link is two things to press
                    for one destination. */}
                <span
                  className={cn(
                    "text-meta font-semibold shrink-0",
                    card.active ? "text-success" : "text-violet-deep",
                  )}
                  data-dashboard={card.id}
                  data-active={card.active ? "1" : "0"}
                >
                  {card.action}
                </span>
              </Card>
            </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
