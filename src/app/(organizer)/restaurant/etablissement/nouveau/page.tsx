import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveSession } from "@/lib/auth/server-session";
import { openVenueDraft } from "@/app/actions/onboarding";
import { activeLot } from "@/lib/lot";
import type { OnboardingVenueType } from "@/lib/types/onboarding";
import { VenueFlow } from "./VenueFlow";
import { ScreenError } from "@/components/restaurant/ScreenError";

// « Créer mon établissement ».
//
// The five screens that used to be steps 2 to 6 of /inscription, and
// the one that now comes before them. They moved here on 27 October
// because this is where they can be stopped and resumed: the partner
// is signed in, the chrome is around them, and the dashboard this
// builds for is already the page they came from.
//
// The route is under `(organizer)`, so the sidebar and the topbar are
// drawn by the shared layout. That is deliberate — a creation flow
// behind the navigation of the thing being created is a flow a partner
// can walk away from and come back to, which a full-page takeover is
// not.
//
// `?type=restaurant` and `?type=bar` come from the chooser's two venue
// cards. They are a hint, not a decision: step 2 still asks, and a
// partner who pressed the wrong card changes it there rather than
// going back.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Créer mon établissement · LYFE" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NouvelEtablissementPage({ searchParams }: Props) {
  // Registered in both lots, because the flow is how a Lot 1
  // deployment gets its first establishment at all.
  if (activeLot() !== 1 && activeLot() !== 2) notFound();

  const session = await resolveSession();
  if (!session) redirect("/login");

  const opened = await openVenueDraft();
  if (!opened.ok) return <ScreenError reference={opened.message} />;

  const query = await searchParams;
  const raw = Array.isArray(query.type) ? query.type[0] : query.type;
  // The chooser's hint, applied to a draft that has not been answered
  // yet. A draft the partner already walked keeps what they said: the
  // card they pressed a week ago does not get to overwrite step 2.
  const hint: OnboardingVenueType | null =
    raw === "bar" ? "bar" : raw === "restaurant" ? "restaurant" : null;
  const draft =
    hint && opened.draft.step <= 1
      ? { ...opened.draft, venueType: hint }
      : opened.draft;

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <VenueFlow initialDraft={draft} />
    </div>
  );
}
