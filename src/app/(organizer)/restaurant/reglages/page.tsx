import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { resolveSession } from "@/lib/auth/server-session";
import { menuItems, venueProfile } from "@/lib/db/overview-store";
import { availability } from "@/lib/db/venue-store";
import { listStaff } from "@/lib/db/venue-write-store";
import { listAssets } from "@/lib/db/asset-store";
import { one } from "@/lib/db/store";
import { VenueSettings } from "@/components/settings/VenueSettings";

// Venue settings.
//
// A dedicated route rather than a spec screen: forms are not blocks, and
// pretending they were would mean inventing a block type per field. The
// spec engine keeps the read surfaces; this is the write surface.

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Réglages du lieu · LYFE" };

export default async function VenueSettingsPage() {
  const session = await resolveSession();
  if (!session) redirect("/login");

  const profile = venueProfile(session.venueId);
  if (!profile) redirect("/restaurant");

  // Columns the read model doesn't carry, needed to populate the form.
  const row = one(
    "SELECT description, address, latitude, longitude, kind FROM venues WHERE id = ?",
    session.venueId,
  );

  return (
    <VenueSettings
      role={session.role}
      identity={{
        name: profile.name,
        shortName: profile.shortName,
        description: String(row?.description ?? ""),
        category: profile.cuisine,
        address: String(row?.address ?? ""),
        city: profile.city,
        latitude: row?.latitude == null ? "" : String(row.latitude),
        longitude: row?.longitude == null ? "" : String(row.longitude),
        contactEmail: profile.contactEmail,
        contactPhone: profile.contactPhone,
        website: profile.website,
        kind: (String(row?.kind ?? "restaurant") === "drinks" ? "drinks" : "restaurant"),
      }}
      listing={{
        priceRange: profile.priceRange,
        tags: profile.tags,
        features: profile.features,
        ambience: profile.ambience,
      }}
      menuItems={menuItems(session.venueId)}
      availability={availability(session.venueId)}
      photos={listAssets(session.venueId, "photo")}
      menuFiles={listAssets(session.venueId, "menu_file")}
      staff={listStaff(session.venueId)}
    />
  );
}
