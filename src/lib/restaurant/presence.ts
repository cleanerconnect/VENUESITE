// Ma fiche — the parts that are not a form.
//
// Identity, listing and photos stay in the form on this route: drag
// reordering and file upload are not blocks. Everything else the target
// specification asks of Ma fiche is — zones offered as a booking
// preference, dress code and age policy, the opening hours read back
// from Disponibilités, and the preview of the listing as the app renders
// it.
//
// The preview is built from the same values the form edits. A preview
// assembled from a second source is a preview that lies.

import type { Block, ScreenSpec } from "@/lib/dashboard/spec";
import { COUNT } from "@/lib/dashboard/formats";
import type { VenueAvailability } from "@/lib/types/business";
import type { RestaurantProfile, Zone } from "@/lib/types/restaurant";
import type { VenueConfiguration, VenueSettings } from "@/lib/types/venue-operations";
import { PRICE_RANGE_LABEL, VENUE_FEATURE } from "@/lib/types/restaurant";
import { hasNightlife } from "@/lib/venue/config";
import { restaurantHref } from "./slugs";

const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function buildPresenceScreen(input: {
  profile: RestaurantProfile | null;
  zones: Zone[];
  availability: VenueAvailability;
  settings: VenueSettings;
  configuration: VenueConfiguration;
  photoCount: number;
}): ScreenSpec {
  const { profile, zones, availability, settings, configuration, photoCount } = input;

  const zoneBlock: Block = {
    id: "zones",
    type: "entity-list",
    heading: "Zones réservables",
    rows: zones.map((zone) => ({
      id: zone.id,
      title: zone.name,
      icon: "map" as const,
      meta: `${zone.capacity} places · ${zone.available ? "proposée à la réservation" : "retirée de l'application"}`,
      badges: zone.available
        ? [{ label: "OUVERTE", tone: "success" as const }]
        : [{ label: "FERMÉE", tone: "muted" as const }],
      trailing: { label: "Places", metric: { value: zone.capacity, format: COUNT } },
      actions: [
        {
          action: {
            kind: "command" as const,
            command: "zone.setAvailable",
            payload: { id: zone.id, value: !zone.available },
            label: zone.available ? "Retirer de l'app" : "Proposer à la réservation",
            icon: zone.available ? ("ban" as const) : ("check" as const),
          },
          variant: zone.available ? ("secondary" as const) : ("primary" as const),
        },
      ],
    })),
    empty: {
      title: "Aucune zone",
      body: "Une zone est une préférence de réservation — salle, terrasse, bar — pas un plan de salle. Sans zone, le client ne choisit pas où s'asseoir.",
      icon: "map",
    },
  };

  const policy: Block = {
    id: "policy",
    type: "settings",
    heading: "Tenue et accès",
    subheading: hasNightlife(configuration)
      ? "Affiché sur la fiche dans l'application, avant la réservation."
      : "Renseigné surtout en configuration lounge. Affiché sur la fiche s'il est rempli.",
    rows: [
      {
        id: "dress-code",
        label: "Dress code",
        control: { kind: "text", value: settings.dressCode },
        command: "settings.set",
        payload: { field: "dressCode" },
        allow: ["owner", "admin"],
      },
      {
        id: "minimum-age",
        label: "Âge minimum",
        hint: "0 pour aucune restriction.",
        control: { kind: "number", value: settings.minimumAge, min: 0, max: 25 },
        command: "settings.set",
        payload: { field: "minimumAge" },
        allow: ["owner", "admin"],
      },
    ],
  };

  // Read-only here on purpose: Disponibilités owns them, and two places
  // to edit opening hours is one place too many.
  const hours: Block = {
    id: "hours",
    type: "table",
    heading: "Horaires",
    headingAction: {
      kind: "link",
      href: restaurantHref("disponibilites"),
      label: "Modifier dans Disponibilités →",
    },
    columns: [
      { key: "day", label: "Jour" },
      { key: "hours", label: "Ouverture" },
      { key: "state", label: "État", align: "right" },
    ],
    rows: WEEKDAYS.map((label, i) => {
      const slots = availability.slots.filter((s) => s.weekday === i + 1);
      const open = slots.filter((s) => s.enabled);
      return {
        id: label,
        cells: {
          day: { value: label },
          hours: {
            value:
              open.length > 0
                ? open.map((s) => `${s.opensAt} – ${s.closesAt}`).join(" · ")
                : "—",
          },
          state: {
            value: open.length > 0 ? "Ouvert" : "Fermé",
            badge:
              open.length > 0
                ? { label: "OUVERT", tone: "success" }
                : { label: "FERMÉ", tone: "muted" },
          },
        },
      };
    }),
    empty: {
      title: "Aucun horaire",
      body: "Sans horaire, l'application ne propose aucun créneau.",
      icon: "clock",
    },
  };

  const preview: Block = {
    id: "preview",
    type: "hero",
    eyebrow: "APERÇU DANS L'APPLICATION",
    title: profile?.name ?? "Établissement",
    subtitle: [
      profile?.cuisine,
      profile?.city,
      profile ? PRICE_RANGE_LABEL[profile.priceRange - 1] : null,
    ]
      .filter(Boolean)
      .join(" · "),
    stats: [
      { label: "Photos", metric: { value: photoCount, format: COUNT }, accent: photoCount < 3 },
      {
        label: "Mots-clés",
        metric: { value: profile?.tags.length ?? 0, format: COUNT },
      },
      {
        label: "Zones proposées",
        metric: { value: zones.filter((z) => z.available).length, format: COUNT },
      },
    ],
    footnote: {
      text:
        photoCount < 3
          ? "Moins de trois photos : la fiche est publiée mais apparaît plus bas dans le fil."
          : profile?.description
            ? profile.description.slice(0, 160)
            : "Aucune description : la fiche n'a rien à dire au client qui l'ouvre.",
      badge:
        photoCount < 3
          ? { label: "À COMPLÉTER", tone: "warning" }
          : { label: "PUBLIÉE", tone: "success" },
    },
  };

  const facilities: Block = {
    id: "facilities",
    type: "entity-list",
    heading: "Équipements affichés",
    rows: (profile?.features ?? []).map((feature) => ({
      id: feature,
      title: VENUE_FEATURE[feature] ?? feature,
      icon: "check" as const,
      meta: "Affiché en icône sur la fiche",
    })),
    empty: {
      title: "Aucun équipement",
      body: "Terrasse, parking, accès PMR, wifi, climatisation, salle privée : ce sur quoi les clients filtrent.",
      icon: "info",
    },
  };

  return {
    slug: "ma-fiche",
    title: "Ma fiche",
    subtitle: "Miroir de la fiche que voit le client. Rien de plus.",
    blocks: [preview, zoneBlock, policy, facilities, hours],
  };
}
