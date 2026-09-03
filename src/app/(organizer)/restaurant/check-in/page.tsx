import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { demoRepository } from "@/lib/data/demo-repository";
import { DEMO_STATE_PARAM, parseDemoState } from "@/lib/data/demo-state";
import { RepositoryError } from "@/lib/data/repository";
import { ScreenSkeleton } from "@/components/restaurant/ScreenSkeleton";
import { ScreenError } from "@/components/restaurant/ScreenError";
import { CheckInScreen } from "@/components/restaurant/CheckInScreen";

// Check-in.
//
// A route rather than a spec screen, for the same reason as Ma fiche: a
// camera viewfinder is not a block, and a screen whose whole job is a
// live video stream and a text field would gain nothing from being
// described as data.
//
// The sheet raised from the phone tab bar still exists and is still the
// fastest path mid-service. This is the same work at full width, with
// the recent list and the undo window the specification asks for.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Check-in · LYFE" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CheckInPage({ searchParams }: Props) {
  const session = await resolveSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const demo = parseDemoState(
    Array.isArray(query[DEMO_STATE_PARAM])
      ? query[DEMO_STATE_PARAM][0]
      : query[DEMO_STATE_PARAM],
  );
  if (demo === "chargement") return <ScreenSkeleton />;

  const repo = demoRepository(getRestaurantRepository(), demo);
  try {
  const [overview, settings] = await Promise.all([
    repo.getOverview(session.venueId),
    repo.getVenueSettings(session.venueId),
  ]);

  return (
    <CheckInScreen
      venueName={overview.restaurant.name}
      configuration={settings.configuration}
      expected={overview.upcomingReservations.map((r) => ({
        id: r.id,
        guestName: r.guestName,
        partySize: r.partySize,
        at: r.at,
        state: r.state,
        zone: overview.zones.find((z) => z.id === r.zoneId)?.name ?? null,
        note: r.note ?? null,
        vip: r.vip,
        depositMad: r.depositMad ?? null,
      }))}
    />
  );
  } catch (error) {
    // Only a repository failure becomes the error screen. `notFound()`
    // and `redirect()` throw too, and swallowing those would turn a
    // deliberate 404 into a misleading "something went wrong".
    if (!(error instanceof RepositoryError)) throw error;
    return <ScreenError reference={error.code} />;
  }
}
