// Two demo organizer profiles, one festival + one venue, so the
// `organizer.type`-conditional UI (notably the Settings "Détails du
// lieu" tab) can be exercised without recreating data.
//
// In production this file disappears: the active profile comes from the
// session payload. The shape of OrganizerProfile is deliberately lean
// so a real backend can return it 1:1.

import type { OrganizerProfile } from "@/lib/types/domain";

export const PROFILES: Record<string, OrganizerProfile> = {
  org_jazzablanca: {
    id: "org_jazzablanca",
    type: "festival",
    name: "Jazzablanca",
    shortName: "Jazzablanca",
    initials: "JZ",
    city: "Casablanca",
    subline: "Festival · Casablanca",
    contactEmail: "hello@jazzablanca.com",
    contactPhone: "+212 522 00 00 00",
    website: "https://jazzablanca.com",
    bio: "Festival international de musique. 19e édition du 02 au 11 juillet 2026 à l'Anfa Park de Casablanca.",
    socials: {
      instagram: "@jazzablanca",
      facebook: "jazzablanca",
      x: "@jazzablanca",
      linkedin: "company/jazzablanca",
      tiktok: "@jazzablanca",
    },
  },
  org_rooftop_mansour: {
    id: "org_rooftop_mansour",
    type: "venue",
    name: "Rooftop Mansour",
    shortName: "Rooftop Mansour",
    initials: "RM",
    city: "Casablanca",
    subline: "Lieu · Casablanca",
    contactEmail: "contact@rooftopmansour.ma",
    contactPhone: "+212 522 49 00 00",
    website: "https://rooftopmansour.ma",
    bio: "Rooftop signature de Casablanca, vue sur le port. Soirées intimistes les vendredis et samedis.",
    socials: {
      instagram: "@rooftopmansour",
      facebook: "rooftopmansour",
      tiktok: "@rooftopmansour",
    },
    primaryVenueId: "v_mansour",
  },
};

export const PROFILE_IDS = Object.keys(PROFILES);

export function getProfile(id: string): OrganizerProfile | undefined {
  return PROFILES[id];
}

export const DEFAULT_PROFILE_ID = "org_jazzablanca";
