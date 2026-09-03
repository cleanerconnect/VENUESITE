import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
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

export default async function CheckInPage() {
  const session = await resolveSession();
  if (!session) redirect("/login");

  const repo = getRestaurantRepository();
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
}
