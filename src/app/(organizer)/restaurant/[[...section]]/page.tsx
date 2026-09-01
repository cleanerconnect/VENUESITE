import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantScreen } from "@/lib/restaurant/screens";
import { restaurantHref } from "@/lib/restaurant/slugs";
import { RESTAURANT } from "@/lib/mock/restaurant";
import { getRestaurantRepository } from "@/lib/data";
import { getAdvisor } from "@/lib/ai";
import type { RestaurantOverview } from "@/lib/types/restaurant";
import { RestaurantScreen } from "@/components/restaurant/RestaurantScreen";

// One route file for the whole restaurant workspace.
//
// The screen is resolved from the URL against the spec registry, so
// /restaurant, /restaurant/salle and /restaurant/versements are the same
// code path with different data. Shipping a new screen means adding a
// builder to the registry — there is no page to write, and the sidebar
// picks it up from the same source.
//
// Both integration seams are exercised here: the payload comes from the
// repository (mock or HTTP, chosen by env) and the suggestion card from
// the advisor (mock or Claude, same idea). Neither the screen builders
// nor any component below knows which implementation answered.

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ section?: string[] }>;
}

const slugOf = (section?: string[]) => (section ?? []).join("/");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const spec = getRestaurantScreen(slugOf(section));
  return { title: spec ? `${spec.title} · LYFE` : "LYFE" };
}

export default async function RestaurantSectionPage({ params }: Props) {
  const { section } = await params;
  const slug = slugOf(section);

  // Resolve the slug before fetching so an unknown one 404s without
  // costing a backend round trip.
  if (!getRestaurantScreen(slug)) notFound();

  const data = await loadOverview();

  // The client gets the payload rather than the built spec: it re-derives
  // the screen from its own optimistic copy, and shipping both would mean
  // shipping the same data twice.
  return <RestaurantScreen slug={slug} data={data} />;
}

/**
 * Payload plus advice. The advisor call is awaited rather than streamed
 * because the nudge sits in the first viewport — a card that pops in
 * after paint reads as a layout bug, not as intelligence.
 */
async function loadOverview(): Promise<RestaurantOverview> {
  const data = await getRestaurantRepository().getOverview(RESTAURANT.id);
  const nudge = await getAdvisor().serviceNudge(data);

  if (!nudge) {
    // Explicitly drop any nudge the payload carried: the advisor is the
    // authority on whether there is advice worth showing.
    return { ...data, nudge: undefined };
  }

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
