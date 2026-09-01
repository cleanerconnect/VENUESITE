import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRestaurantScreen } from "@/lib/restaurant/screens";
import { getRestaurantOverview } from "@/lib/mock/restaurant";
import { RestaurantScreen } from "@/components/restaurant/RestaurantScreen";

// One route file for the whole restaurant workspace.
//
// The screen is resolved from the URL against the spec registry, so
// /restaurant, /restaurant/salle and /restaurant/versements are the same
// code path with different data. Shipping a new screen means adding a
// builder to the registry — there is no page to write, and the sidebar
// picks it up from the same source.

// The specs derive countdowns and "assis depuis N min" from Date.now();
// without this Next would freeze both at build time.
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

  // Resolve the slug here so an unknown one 404s server-side. The client
  // gets the payload rather than the built spec: it re-derives the screen
  // from its own optimistic copy, and shipping both would mean shipping
  // the same data twice.
  if (!getRestaurantScreen(slug)) notFound();

  return <RestaurantScreen slug={slug} data={getRestaurantOverview()} />;
}
