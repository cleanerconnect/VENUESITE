"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { VenueIdentityForm } from "./VenueIdentityForm";
import { OpeningHoursForm } from "./OpeningHoursForm";
import { AssetManager } from "./AssetManager";
import { StaffForm } from "./StaffForm";
import type { PortalRole } from "@/lib/auth/server-session";
import type { VenueAsset } from "@/lib/assets/types";
import type { VenueAvailability } from "@/lib/types/business";
import type { StaffMemberRow } from "@/lib/db/venue-write-store";
import type { VenueIdentityInput } from "@/app/actions/venue";
import { cn } from "@/lib/utils/cn";

type SectionId = "identity" | "hours" | "media" | "staff";

const SECTIONS: { id: SectionId; label: string; minRole: PortalRole[] }[] = [
  { id: "identity", label: "Identité", minRole: ["owner", "manager"] },
  { id: "hours", label: "Horaires", minRole: ["owner", "manager"] },
  { id: "media", label: "Photos et carte", minRole: ["owner", "manager"] },
  { id: "staff", label: "Équipe", minRole: ["owner", "manager", "staff"] },
];

export function VenueSettings({
  role,
  identity,
  availability,
  photos,
  menuFiles,
  staff,
}: {
  role: PortalRole;
  identity: VenueIdentityInput;
  availability: VenueAvailability;
  photos: VenueAsset[];
  menuFiles: VenueAsset[];
  staff: StaffMemberRow[];
}) {
  const visible = SECTIONS.filter((s) => s.minRole.includes(role));
  const [active, setActive] = useState<SectionId>(visible[0]?.id ?? "staff");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-h1 text-ink">Réglages du lieu</h1>
        <p className="text-body text-ink-soft mt-2">
          Tout ce qui suit est enregistré et visible par vos clients dans
          l&apos;application.
        </p>
      </header>

      <div className="border-b border-line-soft overflow-x-auto scroll-thin">
        <div className="flex gap-1 min-w-max">
          {visible.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              aria-pressed={active === s.id}
              className={cn(
                "relative px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                active === s.id ? "text-ink" : "text-ink-mute hover:text-ink",
              )}
            >
              {s.label}
              {active === s.id ? (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-violet rounded-full" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {active === "identity" ? <VenueIdentityForm initial={identity} /> : null}
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
            title="Carte"
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
