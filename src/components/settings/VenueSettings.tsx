"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
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

type SectionId =
  | "identity"
  | "listing"
  | "menu"
  | "hours"
  | "media"
  | "staff";

// Ordered the way a partner fills the fiche in: who you are, how you are
// listed, what you serve, when you are open, what you look like, who else
// gets in.
const SECTIONS: { id: SectionId; label: string; minRole: PortalRole[] }[] = [
  { id: "identity", label: "Identité", minRole: ["owner", "manager"] },
  { id: "listing", label: "Fiche", minRole: ["owner", "manager"] },
  { id: "menu", label: "Carte", minRole: ["owner", "manager"] },
  { id: "hours", label: "Horaires", minRole: ["owner", "manager"] },
  { id: "media", label: "Photos", minRole: ["owner", "manager"] },
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
}: {
  role: PortalRole;
  identity: VenueIdentityInput;
  listing: VenueListingInput;
  menuItems: MenuItemInput[];
  availability: VenueAvailability;
  photos: VenueAsset[];
  menuFiles: VenueAsset[];
  staff: StaffMemberRow[];
}) {
  const visible = SECTIONS.filter((s) => s.minRole.includes(role));
  const [active, setActive] = useState<SectionId>(visible[0]?.id ?? "staff");

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title="Réglages du lieu"
        subtitle="Tout ce qui suit est enregistré et visible par vos clients dans l'application."
      />

      <FilterTabs
        layoutId="venue-settings-underline"
        value={active}
        onChange={setActive}
        tabs={visible.map((s) => ({ id: s.id, label: s.label }))}
      />

      {active === "identity" ? <VenueIdentityForm initial={identity} /> : null}
      {active === "listing" ? <VenueListingForm initial={listing} /> : null}
      {active === "menu" ? <MenuListingForm items={menuItems} /> : null}
      {active === "hours" ? <OpeningHoursForm initial={availability} /> : null}
      {active === "media" ? (
        <div className="space-y-5">
          <AssetManager
            kind="photo"
            title="Photos"
            description="La première photo sert de couverture dans l'application. Glissez pour réordonner."
            initial={photos}
          />
          <AssetManager
            kind="menu_file"
            title="Carte (fichier)"
            description="PDF ou image. Les clients la consultent depuis votre fiche."
            initial={menuFiles}
          />
        </div>
      ) : null}
      {active === "staff" ? (
        <StaffForm initial={staff} canManage={role === "owner"} />
      ) : null}

      {visible.length === 0 ? (
        <Card variant="surface" size="md">
          <p className="text-body text-ink-soft">
            Votre rôle ne donne pas accès aux réglages du lieu.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
