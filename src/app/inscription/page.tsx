import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentDraft } from "@/app/actions/onboarding";
import { resolveSession } from "@/lib/auth/server-session";
import { InscriptionFlow } from "./InscriptionFlow";

// Partner onboarding — « Création de Venue », sprint Prio 02.
//
// Outside the portal shell: there is no session yet, and nothing here
// belongs to an establishment that does not exist. It runs at host
// density all the same, because the person filling it is the same person
// who will read the dashboard on a stand afterwards.
//
// The draft is resolved server-side, so a partner who closed the tab
// reopens on the step they left. That is the whole reason the flow keeps
// its state on the seam rather than in the browser.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inscription · LYFE",
  description: "Inscrire votre établissement sur LYFE.",
};

export default async function InscriptionPage() {
  // Already signed in and already holding a venue: there is nothing to
  // create. Sending them to the dashboard beats a form that would make
  // a second establishment by accident.
  const session = await resolveSession();
  if (session && session.venues.length > 0) redirect("/restaurant");

  const draft = await currentDraft();

  return (
    <div data-density="host" className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-[720px] px-4 py-8 md:px-8 md:py-12">
        <InscriptionFlow initialDraft={draft} />
        <p className="text-meta text-ink-mute mt-8 text-center">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/login"
            className="text-ink underline underline-offset-2 hover:text-violet-deep transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
