import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  SCREEN_NEEDS,
  restaurantScreenTitle,
  type ScreenContext,
} from "@/lib/restaurant/screens";
import {
  isRestaurantSlug,
  restaurantHref,
  type RestaurantSlug,
} from "@/lib/restaurant/slugs";
import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { getAdvisor } from "@/lib/ai";
import type { AnalyticsPeriod } from "@/lib/types/business";
import { ANALYTICS_PERIOD } from "@/lib/types/business";
import type { RestaurantOverview } from "@/lib/types/restaurant";
import { RestaurantScreen } from "@/components/restaurant/RestaurantScreen";

// One route file for the whole restaurant workspace.
//
// The screen is resolved from the URL against the spec registry, so every
// screen is the same code path with different data. Adding one means
// adding a builder — there is no page to write, and the sidebar picks it
// up from the same slug list.
//
// Business Service slices are fetched per-slug from SCREEN_NEEDS rather
// than all at once: rendering the floor plan should not cost a customer
// list and two analytics queries.

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const slugOf = (section?: string[]) => (section ?? []).join("/");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const title = restaurantScreenTitle(slugOf(section));
  return { title: title ? `${title} · LYFE` : "LYFE" };
}

export default async function RestaurantSectionPage({
  params,
  searchParams,
}: Props) {
  const { section } = await params;
  const slug = slugOf(section);
  if (!isRestaurantSlug(slug)) notFound();

  // Venue scoping comes from the session, server side. Nothing here
  // reads a venue id from the URL, and no venue constant is imported.
  const session = await resolveSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const period = readPeriod(query.p);

  const [overview, context] = await Promise.all([
    loadOverview(session.venueId, session.firstName),
    loadContext(slug, session.venueId, period),
  ]);

  return <RestaurantScreen slug={slug} data={overview} context={context} />;
}

/** The period control lives in the URL; anything unknown falls back. */
function readPeriod(raw: string | string[] | undefined): AnalyticsPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value in ANALYTICS_PERIOD
    ? (value as AnalyticsPeriod)
    : "30d";
}

/** Only the slices this screen declares it needs. */
async function loadContext(
  slug: RestaurantSlug,
  venueId: string,
  period: AnalyticsPeriod,
): Promise<Omit<ScreenContext, "overview">> {
  const repo = getRestaurantRepository();
  const needs = SCREEN_NEEDS[slug];
  const ctx: Omit<ScreenContext, "overview"> = { period };

  await Promise.all(
    needs.map(async (need) => {
      switch (need) {
        case "customers":
          ctx.customers = await repo.listCustomers(venueId);
          return;
        case "analytics":
          ctx.analytics = await repo.getAnalytics({
            restaurantId: venueId,
            period,
          });
          return;
        case "visibility":
          ctx.visibility = await repo.getVisibilityMetrics({
            restaurantId: venueId,
            period,
          });
          return;
        case "availability":
          ctx.availability = await repo.getAvailability(venueId);
          return;
      }
    }),
  );

  return ctx;
}

/**
 * Payload plus advice. The advisor call is awaited rather than streamed
 * because the nudge sits in the first viewport — a card that pops in
 * after paint reads as a layout bug, not as intelligence.
 */
async function loadOverview(
  venueId: string,
  viewerFirstName: string,
): Promise<RestaurantOverview> {
  const data = await getRestaurantRepository().getOverview(venueId);
  data.greeting.firstName = viewerFirstName || data.greeting.firstName;
  const nudge = await getAdvisor().serviceNudge(data);

  if (!nudge) return { ...data, nudge: undefined };

  return {
    ...data,
    nudge: {
      headline: nudge.headline,
      body: nudge.body,
      ctaLabel: nudge.ctaLabel,
      href: restaurantHref(nudge.target),
    },
  };
}
