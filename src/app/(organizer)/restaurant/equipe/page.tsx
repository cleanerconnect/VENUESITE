import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { VenueSettings } from "@/components/settings/VenueSettings";

// Venue settings.
//
// A dedicated route rather than a spec screen: forms are not blocks, and
// pretending they were would mean inventing a block type per field. The
// spec engine keeps the read surfaces; this is the write surface.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Équipe et rôles · LYFE" };

export default async function EquipePage() {
  const session = await resolveSession();
  if (!session) redirect("/login");

  // Every read goes through the repository, so this route works
  // identically on SQLite, on the static snapshot, and against a real
  // backend. It used to reach into the store — and raw SQL — directly,
  // which made it the one screen that still required a database.
  const repo = getRestaurantRepository();
  const venueId = session.venueId;

  const [profile, menu, availability, photos, menuFiles, staff] =
    await Promise.all([
      repo.getVenueProfile(venueId),
      repo.listMenuItems(venueId),
      repo.getAvailability(venueId),
      repo.listAssets(venueId, "photo"),
      repo.listAssets(venueId, "menu_file"),
      repo.listStaff(venueId),
    ]);

  if (!profile) redirect("/restaurant");

  return (
    <VenueSettings
      only={["staff"]}
      title="Équipe et rôles"
      subtitle="Qui peut faire quoi. Le dernier propriétaire ne peut être ni rétrogradé ni retiré."
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
  );
}
