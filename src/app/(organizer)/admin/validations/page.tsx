import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { ValidationQueue } from "@/components/admin/ValidationQueue";

// LYFE's review queue. The one screen in this portal that is not a
// partner's.
//
// It is deliberately the plainest surface here: a list, two buttons, and
// the handful of facts a reviewer needs to decide — who signed up, what
// they called the place, where it is, whether they got as far as a photo
// and a week of hours. No metrics, no charts, no venue chrome. The
// decision is « is this a real establishment », and nothing else on the
// screen should suggest otherwise.
//
// `notFound()` rather than a redirect or a message for a partner who
// reaches it: the existence of a LYFE review queue is not something a
// partner's portal should confirm.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Validations · LYFE",
  robots: { index: false, follow: false },
};

export default async function ValidationsPage() {
  const session = await resolveSession();
  if (!session?.lyfeAdmin) notFound();

  const pending = await getRestaurantRepository().listPendingVenues();

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl text-[--color-ink]">
          Établissements à valider
        </h1>
        <p className="mt-1 text-sm text-[--color-ink-soft]">
          {pending.length === 0
            ? "Rien en attente. Les inscriptions arrivent ici dès la dernière étape."
            : pending.length === 1
              ? "Une inscription attend une réponse."
              : `${pending.length} inscriptions attendent une réponse.`}
        </p>
      </header>

      <ValidationQueue venues={pending} />
    </div>
  );
}
