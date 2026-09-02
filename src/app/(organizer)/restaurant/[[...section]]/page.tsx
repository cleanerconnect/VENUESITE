import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  SCREEN_NEEDS,
  getRestaurantScreen,
  type ScreenContext,
} from "@/lib/restaurant/screens";
import {
  isRestaurantSlug,
  restaurantHref,
  type RestaurantSlug,
} from "@/lib/restaurant/slugs";
import { RESTAURANT } from "@/lib/mock/restaurant";
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
  const spec = getRestaurantScreen(slugOf(section));
  return { title: spec ? `${spec.title} · LYFE` : "LYFE" };
}

export default async function RestaurantSectionPage({
  params,
  searchParams,
}: Props) {
  const { section } = await params;
  const slug = slugOf(section);
  if (!isRestaurantSlug(slug)) notFound();

  const query = await searchParams;
  const period = readPeriod(query.p);

  const [overview, context] = await Promise.all([
    loadOverview(),
    loadContext(slug, period),
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
  period: AnalyticsPeriod,
): Promise<Omit<ScreenContext, "overview">> {
  const repo = getRestaurantRepository();
  const needs = SCREEN_NEEDS[slug];
  const ctx: Omit<ScreenContext, "overview"> = { period };

  await Promise.all(
    needs.map(async (need) => {
      switch (need) {
        case "customers":
          ctx.customers = await repo.listCustomers(RESTAURANT.id);
          return;
        case "analytics":
          ctx.analytics = await repo.getAnalytics({
            restaurantId: RESTAURANT.id,
            period,
          });
          return;
        case "visibility":
          ctx.visibility = await repo.getVisibilityMetrics({
            restaurantId: RESTAURANT.id,
            period,
          });
          return;
        case "availability":
          ctx.availability = await repo.getAvailability(RESTAURANT.id);
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
async function loadOverview(): Promise<RestaurantOverview> {
  const data = await getRestaurantRepository().getOverview(RESTAURANT.id);
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
