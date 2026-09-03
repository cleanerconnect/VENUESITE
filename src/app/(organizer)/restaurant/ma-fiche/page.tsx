import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { demoRepository } from "@/lib/data/demo-repository";
import { DEMO_STATE_PARAM, parseDemoState } from "@/lib/data/demo-state";
import { RepositoryError } from "@/lib/data/repository";
import { ScreenSkeleton } from "@/components/restaurant/ScreenSkeleton";
import { ScreenError } from "@/components/restaurant/ScreenError";
import { VenueSettings } from "@/components/settings/VenueSettings";
import { RestaurantSpecScreen } from "@/components/restaurant/RestaurantSpecScreen";
import { buildPresenceScreen } from "@/lib/restaurant/presence";

// Venue settings.
//
// A dedicated route rather than a spec screen: forms are not blocks, and
// pretending they were would mean inventing a block type per field. The
// spec engine keeps the read surfaces; this is the write surface.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ma fiche · LYFE" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MaFichePage({ searchParams }: Props) {
  const session = await resolveSession();
  if (!session) redirect("/login");

  // `?etat=` forces the three states here too, so every one of the
  // thirty screens can be shown failing or empty on demand rather than
  // only when something actually breaks.
  const query = await searchParams;
  const demo = parseDemoState(
    Array.isArray(query[DEMO_STATE_PARAM])
      ? query[DEMO_STATE_PARAM][0]
      : query[DEMO_STATE_PARAM],
  );
  if (demo === "chargement") return <ScreenSkeleton />;

  // Every read goes through the repository, so this route works
  // identically on SQLite, on the static snapshot, and against a real
  // backend. It used to reach into the store — and raw SQL — directly,
  // which made it the one screen that still required a database.
  const repo = demoRepository(getRestaurantRepository(), demo);
  const venueId = session.venueId;

  try {
  const [profile, menu, availability, photos, menuFiles, staff, overview, settings] =
    await Promise.all([
      repo.getVenueProfile(venueId),
      repo.listMenuItems(venueId),
      repo.getAvailability(venueId),
      repo.listAssets(venueId, "photo"),
      repo.listAssets(venueId, "menu_file"),
      repo.listStaff(venueId),
      repo.getOverview(venueId),
      repo.getVenueSettings(venueId),
    ]);

  if (!profile) redirect("/restaurant");

  // Two halves, and the split is honest rather than arbitrary: the form
  // owns what needs a file picker and a drag handle, the spec owns
  // everything that is a value — zones, dress code, hours, the preview.
  const presence = buildPresenceScreen({
    profile,
    zones: overview.zones,
    availability,
    settings,
    configuration: settings.configuration,
    photoCount: photos.length,
  });

  return (
    <div className="space-y-8">
      <VenueSettings
      only={["identity", "listing", "media"]}
      title="Ma fiche"
      subtitle="Tout ce que l'application montre de l'établissement, modifiable ici. Miroir de la fiche, rien de plus."
      role={session.role}
      identity={{
        name: profile.name,
        shortName: profile.shortName,
        description: profile.description,
        category: profile.cuisine,
        address: profile.address,
        city: profile.city,
        latitude: profile.latitude == null ? "" : String(profile.latitude),
        longitude: profile.longitude == null ? "" : String(profile.longitude),
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        website: profile.website,
        // Establishment type (restaurant / bar) — distinct from
        // `profile.kind`, which is the cuisine style. It comes off the
        // session's membership, already resolved.
        kind:
          session.venues.find((v) => v.id === venueId)?.kind === "drinks"
            ? "drinks"
            : "restaurant",
      }}
      listing={{
        priceRange: profile.priceRange,
        tags: profile.tags,
        features: profile.features,
        ambience: profile.ambience,
      }}
      menuItems={menu}
      availability={availability}
      photos={photos}
      menuFiles={menuFiles}
      staff={staff}
      />

      <RestaurantSpecScreen spec={presence} />
    </div>
  );
  } catch (error) {
    // Only a repository failure becomes the error screen. `notFound()`
    // and `redirect()` throw too, and swallowing those would turn a
    // deliberate 404 into a misleading "something went wrong".
    if (!(error instanceof RepositoryError)) throw error;
    return <ScreenError reference={error.code} />;
  }
}
