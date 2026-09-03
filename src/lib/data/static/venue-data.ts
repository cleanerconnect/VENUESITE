// The static venue dataset.
//
// Captured from the seeded database by `npm run db:snapshot`, so its
// shapes cannot drift from what the SQLite path returns — the snapshot
// *is* that path's payload, serialised.
//
// Timestamps are rebased on read. A snapshot taken in March would
// otherwise show a service that ended months ago, and "assis depuis
// 185 571 min" is exactly the sort of detail that tells a partner the
// whole screen is fake. Every ISO instant in the payload shifts by
// (now − capturedAt), so the demo stays live however old the file is.

import snapshot from "./venue-snapshot.json";
import type {
  BusinessAccount,
  Customer,
  NotificationPreferences,
  PortalNotification,
  VenueAnalytics,
  VenueAvailability,
  VisibilityMetrics,
} from "@/lib/types/business";
import type { MenuItem, RestaurantOverview, RestaurantProfile } from "@/lib/types/restaurant";
import type { VenueAsset } from "@/lib/assets/types";
import type { StaffMemberRow } from "@/lib/db/venue-write-store";
import type {
  Growth,
  GuestGraph,
  Marketing,
  MoneyDesk,
  Nightlife,
  ServiceFloor,
  Subscription,
  SupportTicket,
  SurveyConfig,
  VenueSettings,
} from "@/lib/types/venue-operations";
import type { ServiceConfiguration } from "@/lib/data/repository";

/**
 * The Phase 5 bundles, exactly as the operations store returns them.
 *
 * Rebased differently from the rest of the payload: these carry plain
 * calendar dates — a night, an offer window, a briefing day — and a
 * calendar frozen on the day the snapshot was taken is a calendar that
 * shows tonight's guest list four months ago.
 */
export interface OperationsBundle {
  serviceFloor: ServiceFloor;
  guestGraph: GuestGraph;
  growth: Growth;
  nightlife: Nightlife;
  moneyDesk: MoneyDesk;
  marketing: Marketing;
  serviceConfiguration: ServiceConfiguration;
  surveyConfig: SurveyConfig;
  settings: VenueSettings;
  subscription: Subscription;
  supportTickets: SupportTicket[];
  spendByCustomer: Record<string, number>;
}

export interface DirectoryUser {
  userId: string;
  fullName: string;
  email: string;
  venues: {
    id: string;
    name: string;
    shortName: string;
    initials: string;
    city: string;
    kind: string;
    role: string;
  }[];
}

interface VenueBundle {
  overview: RestaurantOverview;
  profile: RestaurantProfile | null;
  menuItems: MenuItem[];
  availability: VenueAvailability;
  customers: Customer[];
  notifications: PortalNotification[];
  notificationPreferences: NotificationPreferences;
  staff: StaffMemberRow[];
  photos: VenueAsset[];
  menuFiles: VenueAsset[];
  analytics: Record<string, VenueAnalytics>;
  visibility: Record<string, VisibilityMetrics>;
  operations: OperationsBundle;
}

interface Snapshot {
  capturedAt: string;
  users: DirectoryUser[];
  businessAccounts: Record<string, BusinessAccount>;
  venues: Record<string, VenueBundle>;
}

const RAW = snapshot as unknown as Snapshot;

// Matches a full ISO-8601 instant, which is the only date shape the
// payload carries. Plain `YYYY-MM-DD` calendar dates (an availability
// weekday, an analytics bucket) are deliberately excluded: shifting
// those would misalign them from the day boundaries they index.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** A bare calendar day. Shifted only inside the operations bundle. */
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

function rebase<T>(value: T, offsetMs: number): T {
  if (typeof value === "string") {
    return (ISO_INSTANT.test(value)
      ? new Date(Date.parse(value) + offsetMs).toISOString()
      : value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => rebase(v, offsetMs)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = rebase(v, offsetMs);
    return out as unknown as T;
  }
  return value;
}

/**
 * The same shift, plus whole-day movement for bare calendar dates.
 *
 * Applied only to the operations bundle. Everywhere else a bare date is
 * a bucket key — an analytics day, an availability weekday — and moving
 * it would misalign it from the boundary it indexes. Here it is a night,
 * an offer window or a service date, and not moving it is what makes a
 * six-month-old snapshot show an empty diary.
 */
function rebaseWithDays<T>(value: T, offsetMs: number, offsetDays: number): T {
  if (typeof value === "string") {
    if (ISO_INSTANT.test(value)) {
      return new Date(Date.parse(value) + offsetMs).toISOString() as unknown as T;
    }
    if (CALENDAR_DAY.test(value)) {
      const shifted = new Date(`${value}T12:00:00Z`);
      shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
      return shifted.toISOString().slice(0, 10) as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => rebaseWithDays(v, offsetMs, offsetDays)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = rebaseWithDays(v, offsetMs, offsetDays);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Rebased once per process rather than per request. A long-running dev
 * server drifts by however long it has been up, which is invisible at
 * the scale the screens show and costs nothing to keep exact.
 */
let cached: Snapshot | null = null;

function data(): Snapshot {
  if (cached) return cached;
  const offset = Date.now() - Date.parse(RAW.capturedAt);
  const dayOffset = Math.round(offset / 86_400_000);
  const venues: Record<string, VenueBundle> = {};
  for (const [id, bundle] of Object.entries(RAW.venues)) {
    venues[id] = {
      ...rebase(bundle, offset),
      operations: rebaseWithDays(bundle.operations, offset, dayOffset),
    };
  }
  cached = {
    ...RAW,
    users: RAW.users,
    businessAccounts: RAW.businessAccounts,
    venues,
  };
  return cached;
}

/** When the dataset was captured. Surfaced in /api/health. */
export const CAPTURED_AT = RAW.capturedAt;

export function staticUsers(): DirectoryUser[] {
  return data().users;
}

export function staticUser(userId: string): DirectoryUser | null {
  return data().users.find((u) => u.userId === userId) ?? null;
}

export function staticUserByEmail(email: string): DirectoryUser | null {
  const needle = email.trim().toLowerCase();
  return data().users.find((u) => u.email.toLowerCase() === needle) ?? null;
}

export function staticBusinessAccount(userId: string): BusinessAccount | null {
  return data().businessAccounts[userId] ?? null;
}

export function staticVenue(venueId: string): VenueBundle | null {
  return data().venues[venueId] ?? null;
}

export function staticVenueIds(): string[] {
  return Object.keys(data().venues);
}

/** The Phase 5 bundles for one venue. */
export function staticOperations(venueId: string): OperationsBundle | null {
  return data().venues[venueId]?.operations ?? null;
}
