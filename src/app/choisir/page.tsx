import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveSession } from "@/lib/auth/server-session";
import { resolveAccount } from "@/lib/auth/accounts";
import { CHOOSER_LINE, dashboardsFor } from "@/lib/nav/dashboards";
import { Brand } from "@/components/organizer/Brand";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
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
// Three cards, always three. Hiding what you do not have would make a
// screen that cannot tell a partner the bar space exists, which is the
// one thing it is in a position to do.
//
// **One layout for the three**, because they are three answers to one
// question and a card that is shaped differently reads as a different
// kind of thing. Icon beside the title, the line under it, and a
// full-width button at the foot — the same geometry whether the space
// is held or offered. The two cards used to disagree about all three:
// one was a link with a word floated right, the other a row that broke
// into a column under 640 and put its button at the end.
//
// What differs is weight, not shape. The held space carries a primary
// « Ouvrir » and an « Actif » badge beside its title; the ones to add
// carry a secondary « Ajouter ». A partner on this screen is almost
// always here to get back to work, so the space they already use is
// the full-width primary — the easiest thing on the page to hit, and
// at a glance the one the page is pointing at.
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
            return (
              <Card
                key={card.id}
                variant="surface"
                size="md"
                // The held card is the one the screen is pointing at,
                // so its border says so too — `surface` paints
                // `border-line` and `cn` lets this override it. A
                // full-width violet button inside a card wearing the
                // same hairline as the two below it is loud in the
                // control and silent in the frame.
                className={cn(
                  "flex flex-col gap-4",
                  card.active && "border-violet/40",
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-chip",
                      card.active
                        ? "bg-violet-soft text-ink"
                        : "bg-canvas-2 text-ink-soft",
                    )}
                  >
                    {Glyph ? <Glyph size={20} strokeWidth={2} /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* The badge sits beside the title, on the title's
                        own line, and wraps under it on a narrow phone
                        rather than squeezing the label. `items-start`
                        above keeps the icon level with this row however
                        many lines the two of them take. */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className="text-body font-semibold text-ink"
                        data-space-label={card.id}
                      >
                        {card.label}
                      </span>
                      {card.active ? (
                        // `data-space-state` is for the tools: « beside
                        // the title » is a claim about geometry, and
                        // the only way to assert it is to let the tool
                        // measure the badge against the label.
                        <Pill
                          tone="success"
                          dot
                          className="h-5 px-2"
                          data-space-state={card.id}
                        >
                          Actif
                        </Pill>
                      ) : null}
                    </div>
                    <span className="block text-meta text-ink-soft mt-1">
                      {card.line}
                    </span>
                  </div>
                </div>

                {/* The action, at the foot, the width of the card.
                    Neither card is a link as a whole any more: a
                    full-width button *is* the card's hit area for all
                    practical purposes, and a link wrapped around a
                    button is two targets for one destination. */}
                <Link
                  href={card.href}
                  // One verb is the right *visible* label and the wrong
                  // accessible one: three links reading « Ouvrir »,
                  // « Ajouter », « Ajouter » tell a partner tabbing
                  // through them nothing, and the title that
                  // disambiguates them is only next to the button, not
                  // in it. The name says which space.
                  aria-label={`${card.action} · ${card.label}`}
                  className={buttonClass(
                    card.active ? "primary" : "secondary",
                    "md",
                    "w-full",
                  )}
                >
                  {/* The marker sits on the word, inside the link, in
                      both states — so one selector reads the action
                      whichever card it is, and the thing a tool clicks
                      is the link either way. */}
                  <span
                    data-dashboard={card.id}
                    data-active={card.active ? "1" : "0"}
                  >
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
