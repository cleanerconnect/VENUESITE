import Link from "next/link";
import { Store } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/button-style";
import { NEW_VENUE_PATH } from "@/lib/restaurant/slugs";

// Accueil, before there is anything to show on it.
//
// A state the portal did not have until the 27 October split. The old
// road created the establishment and the account in one walk, so a
// dashboard without a venue was unreachable — and the code said so by
// crashing on `getVenueSettings("")` rather than by drawing anything.
//
// Now a partner picks « Restaurant » on the chooser and arrives here
// first. What this screen owes them is three things, and nothing else:
// that the space is theirs and works, that one thing is missing, and
// the single button that fixes it. No sample data, no greyed-out
// preview of the tiles they would have — a dashboard pretending to
// have a service tonight is a dashboard that cannot be trusted the day
// it really does.
//
// One button. There is exactly one thing to do, so a second affordance
// — « voir une démo », « importer », « plus tard » — would be a choice
// invented to fill a layout.

export function EmptyDashboard({ firstName }: { firstName: string }) {
  return (
    <div className="flex flex-col gap-4">
      {firstName ? (
        <h1 className="text-h2 text-ink">Bonjour {firstName}.</h1>
      ) : (
        <h1 className="text-h2 text-ink">Bonjour.</h1>
      )}

      <Card
        variant="surface"
        size="lg"
        className="flex flex-col items-start gap-4"
        data-empty-dashboard
      >
        <span
          aria-hidden
          className="grid h-12 w-12 place-items-center rounded-chip bg-violet-soft text-ink"
        >
          <Store size={24} strokeWidth={2} />
        </span>

        <p className="text-h3 text-ink">
          Votre espace est prêt. Créez votre établissement pour recevoir vos
          premières réservations
        </p>

        <Link
          href={NEW_VENUE_PATH}
          className={buttonClass("primary", "lg")}
          data-variant="primary"
          data-size="lg"
        >
          Créer mon établissement
        </Link>
      </Card>
    </div>
  );
}
