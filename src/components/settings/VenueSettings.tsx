"use client";

import { useState } from "react";
import { VenueIdentityForm } from "./VenueIdentityForm";
import { VenueListingForm } from "./VenueListingForm";
import { MenuListingForm } from "./MenuListingForm";
import { OpeningHoursForm } from "./OpeningHoursForm";
import { AssetManager } from "./AssetManager";
import { StaffForm } from "./StaffForm";
import type { PortalRole } from "@/lib/auth/server-session";
import type { VenueAsset } from "@/lib/assets/types";
import type { VenueAvailability } from "@/lib/types/business";
import type { StaffMemberRow } from "@/lib/db/venue-write-store";
import type {
  MenuItemInput,
  VenueIdentityInput,
  VenueListingInput,
} from "@/app/actions/venue";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PermissionDenied } from "@/components/data/QueryState";
import { MENU_FILE_MAX } from "@/lib/types/restaurant";

type SectionId =
  | "identity"
  | "listing"
  | "menu"
  | "menu_file"
  | "hours"
  | "media"
  | "staff";

// Ordered the way a partner fills the fiche in: who you are, how you are
// listed, what you serve, when you are open, what you look like, who else
// gets in.
//
// `menu` and `menu_file` are two different screens for two different
// jobs. `menu` is Lot 2's dish editor — name, price, dietary markers,
// visible or not — and it belongs to the Menu route. `menu_file` is the
// tab a basique deployment gets: the carte as a file, which is what the
// app's « Menu » pill opens. A venue that photographs its menu every
// season is not a venue that will keep forty dish rows current, and
// buying it an editor it will not use is worse than buying it nothing.
const SECTIONS: { id: SectionId; label: string; minRole: PortalRole[] }[] = [
  { id: "identity", label: "Identité", minRole: ["owner", "manager"] },
  { id: "listing", label: "Fiche", minRole: ["owner", "manager"] },
  { id: "menu", label: "Carte", minRole: ["owner", "manager"] },
  { id: "hours", label: "Horaires", minRole: ["owner", "manager"] },
  { id: "media", label: "Photos", minRole: ["owner", "manager"] },
  { id: "menu_file", label: "Menu", minRole: ["owner", "manager"] },
  { id: "staff", label: "Équipe", minRole: ["owner", "manager", "staff"] },
];

export function VenueSettings({
  role,
  identity,
  listing,
  menuItems,
  availability,
  photos,
  menuFiles,
  staff,
  only,
  title,
  subtitle,
}: {
  role: PortalRole;
  /**
   * Which panels this route renders. The target specification splits the
   * old single settings page into Ma fiche, Menu and Équipe et rôles, and
   * each is a route over the same form rather than three copies of it.
   */
  only?: SectionId[];
  title?: string;
  subtitle?: string;
  identity: VenueIdentityInput;
  listing: VenueListingInput;
  menuItems: MenuItemInput[];
  availability: VenueAvailability;
  photos: VenueAsset[];
  menuFiles: VenueAsset[];
  staff: StaffMemberRow[];
}) {
  const visible = SECTIONS.filter(
    (s) => s.minRole.includes(role) && (!only || only.includes(s.id)),
  );
  const [active, setActive] = useState<SectionId>(visible[0]?.id ?? "staff");

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={title ?? "Ma fiche"}
        subtitle={
          subtitle ??
          "Tout ce qui suit est enregistré et visible par vos clients dans l'application."
        }
      />

      {/* A single-panel route has nothing to switch between. */}
      {visible.length > 1 ? (
      <FilterTabs
        layoutId="venue-settings-underline"
        value={active}
        onChange={setActive}
        tabs={visible.map((s) => ({ id: s.id, label: s.label }))}
      />
      ) : null}

      {active === "identity" ? <VenueIdentityForm initial={identity} /> : null}
      {active === "listing" ? <VenueListingForm initial={listing} /> : null}
      {active === "menu" ? <MenuListingForm items={menuItems} /> : null}
      {active === "hours" ? <OpeningHoursForm initial={availability} /> : null}
      {/* The app's header is a carousel, so this is a list in an order,
          not one picture with spares: the first is the cover on every
          list card, the rest play behind it. */}
      {active === "media" ? (
        <AssetManager
          kind="photo"
          title="Photos"
          description="La première est la couverture, et l'ordre est celui du carrousel dans l'application. Sur les autres, Couverture la met en premier."
          layout="gallery"
          addLabel="Ajouter une photo"
          initial={photos}
        />
      ) : null}
      {/* What the app's « Menu » pill opens. A file, and only a file:
          the dish editor is Lot 2's Carte, one tab over. */}
      {active === "menu_file" ? (
        <AssetManager
          kind="menu_file"
          title="Menu"
          description={`Votre carte, telle quelle : un PDF, ou jusqu'à ${MENU_FILE_MAX} photos de ses pages, dans l'ordre. Les clients l'ouvrent depuis votre fiche.`}
          addLabel="Ajouter un fichier"
          max={MENU_FILE_MAX}
          initial={menuFiles}
        />
      ) : null}
      {active === "staff" ? (
        <StaffForm initial={staff} canManage={role === "owner"} />
      ) : null}

      {visible.length === 0 ? (
        <PermissionDenied
          what="les réglages de ce lieu"
          requiredRole="un propriétaire ou un gérant"
        />
      ) : null}
    </div>
  );
}
