import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  SCREEN_NEEDS,
  isFormRoute,
  restaurantScreenTitle,
  type ScreenContext,
  type SpecSlug,
} from "@/lib/restaurant/screens";
import type { Comparison } from "@/lib/restaurant/operations";
import { isRestaurantSlug, restaurantHref } from "@/lib/restaurant/slugs";
import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { demoRepository } from "@/lib/data/demo-repository";
import { DEMO_STATE_PARAM, parseDemoState } from "@/lib/data/demo-state";
import { RepositoryError } from "@/lib/data/repository";
import { ScreenSkeleton } from "@/components/restaurant/ScreenSkeleton";
import { ScreenError } from "@/components/restaurant/ScreenError";
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
  // Form surfaces have their own routes, which Next resolves before this
  // catch-all. Reaching here with one means a stale link.
  if (!isRestaurantSlug(slug) || isFormRoute(slug)) notFound();

  // Venue scoping comes from the session, server side. Nothing here
  // reads a venue id from the URL, and no venue constant is imported.
  const session = await resolveSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const period = readPeriod(query.p);
  const comparison = readComparison(query.c);
  const demo = parseDemoState(
    Array.isArray(query[DEMO_STATE_PARAM])
      ? query[DEMO_STATE_PARAM][0]
      : query[DEMO_STATE_PARAM],
  );

  // A server render cannot stay pending, so the loading state paints the
  // skeleton the route's own `loading.tsx` would. Same component, so what
  // a reviewer forces is exactly what a slow request shows.
  if (demo === "chargement") return <ScreenSkeleton />;

  const repo = demoRepository(getRestaurantRepository(), demo);

  try {
    const [overview, context] = await Promise.all([
      loadOverview(repo, session.venueId, session.firstName),
      loadContext(repo, slug, session.venueId, period, comparison),
    ]);
    return <RestaurantScreen slug={slug} data={overview} context={context} />;
  } catch (error) {
    // The error state, reached either by forcing it or by a real
    // failure. Both land here, which is the point: the forced one is
    // not a separate screen that can drift from the real one.
    //
    // Only a repository failure qualifies. `notFound()` and `redirect()`
    // throw as well, and swallowing those would turn a deliberate 404
    // into a misleading "something went wrong".
    if (!(error instanceof RepositoryError)) throw error;
    return <ScreenError reference={error.code} />;
  }
}

/** The period control lives in the URL; anything unknown falls back. */
function readPeriod(raw: string | string[] | undefined): AnalyticsPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value in ANALYTICS_PERIOD
    ? (value as AnalyticsPeriod)
    : "30d";
}

/** The comparison baseline lives in the URL too. */
function readComparison(raw: string | string[] | undefined): Comparison {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "last_year" ? "last_year" : "previous";
}

/**
 * Only the slices this screen declares it needs.
 *
 * The configuration is always read: it decides vocabulary, and every
 * screen uses vocabulary. Everything else comes from SCREEN_NEEDS, so
 * rendering the guest list does not cost a customer list and two
 * analytics queries.
 */
async function loadContext(
  repo: ReturnType<typeof getRestaurantRepository>,
  slug: SpecSlug,
  venueId: string,
  period: AnalyticsPeriod,
  comparison: Comparison,
): Promise<Omit<ScreenContext, "overview">> {
  const needs = SCREEN_NEEDS[slug];

  const settings = await repo.getVenueSettings(venueId);
  const ctx: Omit<ScreenContext, "overview"> = {
    period,
    comparison,
    configuration: settings.configuration,
    settings,
  };

  await Promise.all(
    needs.map(async (need) => {
      switch (need) {
        case "customers":
          ctx.customers = await repo.listCustomers(venueId);
          return;
        case "analytics":
          ctx.analytics = await repo.getAnalytics({ restaurantId: venueId, period });
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
        case "serviceFloor":
          ctx.serviceFloor = await repo.getServiceFloor(venueId);
          return;
        case "guestGraph":
          ctx.guestGraph = await repo.getGuestGraph(venueId);
          return;
        case "growth":
          ctx.growth = await repo.getGrowth(venueId);
          return;
        case "nightlife":
          ctx.nightlife = await repo.getNightlife(venueId);
          return;
        case "money":
          ctx.money = await repo.getMoneyDesk(venueId);
          return;
        case "marketing":
          ctx.marketing = await repo.getMarketing(venueId);
          return;
        case "serviceConfig":
          ctx.serviceConfig = await repo.getServiceConfiguration(venueId);
          return;
        case "survey":
          ctx.survey = await repo.getSurveyConfig(venueId);
          return;
        case "settings":
          // Already loaded above; the declaration is what documents that
          // this screen is about them.
          return;
        case "subscription":
          ctx.subscription = await repo.getSubscription(venueId);
          return;
        case "support":
          ctx.support = await repo.listSupportTickets(venueId);
          return;
        case "spend":
          ctx.spendByCustomer = await repo.getSpendByCustomer(venueId);
          return;
        case "notificationPrefs":
          ctx.notificationPreferences =
            await repo.getNotificationPreferences(venueId);
          return;
        case "profile": {
          const [profile, photos] = await Promise.all([
            repo.getVenueProfile(venueId),
            repo.listAssets(venueId, "photo"),
          ]);
          ctx.profile = profile;
          ctx.photoCount = photos.length;
          return;
        }
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
  repo: ReturnType<typeof getRestaurantRepository>,
  venueId: string,
  viewerFirstName: string,
): Promise<RestaurantOverview> {
  const data = await repo.getOverview(venueId);
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
