"use client";

import { useState } from "react";
import { VenueIdentityForm } from "./VenueIdentityForm";
import { VenueListingForm } from "./VenueListingForm";
import { MenuListingForm } from "./MenuListingForm";
import { MenuBoardForm } from "./MenuBoardForm";
import { OpeningHoursForm } from "./OpeningHoursForm";
import { AssetManager } from "./AssetManager";
import { ThumbnailUpload } from "./ThumbnailUpload";
import { StaffForm } from "./StaffForm";
import type { PortalRole } from "@/lib/auth/server-session";
import type { VenueAsset } from "@/lib/assets/types";
import type { VenueAvailability } from "@/lib/types/business";
import type { StaffMemberRow } from "@/lib/db/venue-write-store";
import type { VenueMenu } from "@/lib/types/restaurant";
import type {
  MenuItemInput,
  VenueIdentityInput,
  VenueListingInput,
} from "@/app/actions/venue";
import { Card } from "@/components/ui/Card";
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
  { id: "listing", label: "Détails", minRole: ["owner", "manager"] },
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
  menu,
  availability,
  photos,
  menuFiles,
  thumbnail,
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
  /** The card as sections with dishes — what the Menu tab edits. */
  menu: VenueMenu;
  availability: VenueAvailability;
  photos: VenueAsset[];
  menuFiles: VenueAsset[];
  /** The square tile, as a list of nought or one. */
  thumbnail: VenueAsset[];
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

      {/* The vignette above the words, because it is the first thing
          a guest sees of this venue and the form below it is the
          second. It is an asset, not a field, so it saves on its own
          and the identity form's bar counts only what the form owns. */}
      {active === "identity" ? (
        <div className="space-y-6">
          <Card variant="surface" size="md">
            <h2 className="text-h3 text-ink mb-1">Vignette</h2>
            <p className="text-meta text-ink-mute mb-4">
              Le carré qui vous représente dans les listes de
              l&apos;application.
            </p>
            <ThumbnailUpload initial={thumbnail} />
          </Card>
          <VenueIdentityForm initial={identity} />
        </div>
      ) : null}
      {active === "listing" ? <VenueListingForm initial={listing} /> : null}
      {active === "menu" ? (
        <MenuListingForm
          items={menuItems}
          sections={menu.sections.map((s) => ({ id: s.id, name: s.name }))}
        />
      ) : null}
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
      {/* What the app's Menu screen draws.
          It was an upload and nothing else — a PDF, or ten photographs
          of the pages — which gave the app a file to offer and no menu
          to lay out, and gave the guest prices from whenever the card
          was last printed. The board is the menu; the file stays under
          it, for a venue whose card is a designed object. */}
      {active === "menu_file" ? (
        <div className="space-y-6">
          <MenuBoardForm initial={menu} />
          <AssetManager
            kind="menu_file"
            title="La carte en PDF"
            description={`Facultatif, et en plus de la liste ci-dessus : un PDF, ou jusqu'à ${MENU_FILE_MAX} photos de ses pages, dans l'ordre. Les clients peuvent l'ouvrir depuis votre fiche.`}
            addLabel="Ajouter un fichier"
            max={MENU_FILE_MAX}
            initial={menuFiles}
          />
        </div>
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
