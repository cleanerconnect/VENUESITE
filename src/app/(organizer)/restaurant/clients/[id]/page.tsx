import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { demoRepository } from "@/lib/data/demo-repository";
import { DEMO_STATE_PARAM, parseDemoState } from "@/lib/data/demo-state";
import { RepositoryError } from "@/lib/data/repository";
import { ScreenSkeleton } from "@/components/restaurant/ScreenSkeleton";
import { ScreenError } from "@/components/restaurant/ScreenError";
import { buildCustomerScreen } from "@/lib/restaurant/customer";
import { RestaurantSpecScreen } from "@/components/restaurant/RestaurantSpecScreen";

// Fiche client.
//
// A detail route under Clients rather than a slug of its own, because it
// is always opened for one guest. The specification counts it among the
// thirty screens; this is where it lives.

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await resolveSession();
  if (!session) return { title: "Client · LYFE" };
  const customer = await getRestaurantRepository().getCustomer(session.venueId, id);
  return { title: `${customer?.fullName ?? "Client"} · LYFE` };
}

export default async function CustomerPage({ params, searchParams }: Props) {
  const { id } = await params;
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
  const venueId = session.venueId;

  try {
  const [customer, overview, graph, spend, desk, marketing, settings] =
    await Promise.all([
      repo.getCustomer(venueId, id),
      repo.getOverview(venueId),
      repo.getGuestGraph(venueId),
      repo.getSpendByCustomer(venueId),
      repo.getMoneyDesk(venueId),
      repo.getMarketing(venueId),
      repo.getVenueSettings(venueId),
    ]);

  // Unknown id inside a venue the user does hold is a 404, not an empty
  // profile: a plausible-looking blank page for a guest who does not
  // exist is worse than saying so.
  if (!customer) notFound();

  const spec = buildCustomerScreen({
    customer,
    reviews: overview.reviews,
    reservations: [...overview.upcomingReservations, ...overview.waitlist],
    tagIds: graph.tagsByCustomer[customer.id] ?? [],
    tags: graph.tags,
    spendMad: spend[customer.id],
    hasSpendSource: desk.hasTransactionSource,
    messages: marketing.messages.filter((m) => m.customerId === customer.id),
    configuration: settings.configuration,
  });

  return <RestaurantSpecScreen spec={spec} />;
  } catch (error) {
    // Only a repository failure becomes the error screen. `notFound()`
    // and `redirect()` throw too, and swallowing those would turn a
    // deliberate 404 into a misleading "something went wrong".
    if (!(error instanceof RepositoryError)) throw error;
    return <ScreenError reference={error.code} />;
  }
}
