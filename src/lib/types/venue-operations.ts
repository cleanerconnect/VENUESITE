// The rest of the venue perimeter.
//
// One module for everything Phase 5 added, mirroring the tables in
// `db/schema.sql` the same way `business.ts` mirrors the ones before it.
// Money crosses this boundary in MAD, never centimes — the conversion
// happens in the store and nowhere else.
//
// Read these as six bundles rather than twenty-odd loose lists. A screen
// asks for the bundle it needs; the seam has six reads instead of forty,
// and a screen cannot accidentally render a hero from one snapshot and a
// list from another.

// ── Service time ─────────────────────────────────────────────

export type WaitlistSource = "walk_in" | "app";
export type WaitlistStatus = "waiting" | "notified" | "seated" | "left";
export type WaitlistRemovalReason = "parti" | "no_show" | "doublon";

export interface WaitlistParty {
  id: string;
  customerId: string | null;
  guestName: string;
  guestPhone: string;
  partySize: number;
  /** Minutes promised at the door. */
  quotedMinutes: number;
  addedAt: string;
  notifiedAt: string | null;
  seatedAt: string | null;
  removedAt: string | null;
  source: WaitlistSource;
  status: WaitlistStatus;
  removalReason: WaitlistRemovalReason | null;
  note: string;
  /** The booking "Installer" created, so the visit is one chain. */
  reservationId: string | null;
}

export interface WaitlistSettings {
  onlineOpen: boolean;
  maxPartyOnline: number;
  defaultQuoteMinutes: number;
  /** Why the online list is paused. Empty when it is open. */
  pausedReason: string;
  updatedAt: string;
}

export interface ShiftNote {
  id: string;
  serviceId: string | null;
  date: string;
  authorId: string;
  author: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

/** One guest the team should know about before doors open. */
export interface BriefingGuest {
  reservationId: string;
  customerId: string | null;
  guestName: string;
  partySize: number;
  at: string;
  zone: string | null;
  tags: string[];
  preferences: string[];
  note: string | null;
  visitCount: number;
  noShowCount: number;
  depositStatus: DepositStatus | null;
}

export interface Briefing {
  serviceId: string | null;
  serviceLabel: string;
  date: string;
  covers: number;
  bookings: number;
  guests: BriefingGuest[];
  notes: ShiftNote[];
}

/** One day in the calendar grid. */
export interface CalendarDay {
  date: string;
  covers: number;
  bookings: number;
  capacity: number;
  closed: boolean;
  closureReason: string;
  /** Set when a manager overrode the day's capacity from Calendrier. */
  capacityOverride: number | null;
  capacityNote: string;
  offerIds: string[];
  experienceIds: string[];
}

export interface ServiceFloor {
  waitlist: WaitlistParty[];
  waitlistSettings: WaitlistSettings;
  briefing: Briefing;
  /** Ninety days from four weeks back — enough for week and month views. */
  calendar: CalendarDay[];
}

// ── Availability configuration ───────────────────────────────

export interface ServiceDefinition {
  id: string;
  name: string;
  kind: string;
  /** ISO weekdays, 1 = Monday. */
  weekdays: number[];
  startsAt: string;
  endsAt: string;
  lastBookingAt: string;
  capacityCovers: number;
  coversPerQuarter: number;
  turnMinutesSmall: number;
  turnMinutesLarge: number;
  zoneIds: string[];
  enabled: boolean;
  /** Checked on write. A stale edit is refused, never merged. */
  version: number;
  updatedAt: string;
}

export interface PacingRules {
  maxArrivalsPerQuarter: number;
  maxCoversPerService: number;
  maxPartyOnline: number;
  minPartyOnline: number;
  requestOnlyAbove: number;
  bookingWindowDays: number;
  sameDayCutoff: string;
  minLeadMinutes: number;
  onlineBookingOpen: boolean;
  reopenAt: string | null;
  version: number;
  updatedAt: string;
}

// ── Guest vocabulary ─────────────────────────────────────────

export type TagOrigin = "manual" | "auto";
export type TagRuleKind =
  | "habitue"
  | "gros_panier"
  | "a_risque"
  | "nouveau"
  | "inactif";

export interface GuestTag {
  id: string;
  label: string;
  colour: string;
  origin: TagOrigin;
  staffVisible: boolean;
  archived: boolean;
  /** How many guests carry it. Derived, never stored on the tag. */
  usageCount: number;
}

export interface TagRule {
  id: string;
  tagId: string;
  tagLabel: string;
  rule: TagRuleKind;
  /** Visits, no-shows, or a spend floor in MAD, per rule. */
  threshold: number;
  windowDays: number;
  enabled: boolean;
}

export interface GuestSegment {
  id: string;
  name: string;
  description: string;
  criteria: Record<string, unknown>;
  memberCount: number;
  updatedAt: string;
}

export interface GuestGraph {
  tags: GuestTag[];
  rules: TagRule[];
  segments: GuestSegment[];
  /** Tag ids per customer, so a list can render chips without N reads. */
  tagsByCustomer: Record<string, string[]>;
}

// ── Growth ───────────────────────────────────────────────────

export type OfferKind = "percent" | "amount" | "free_item" | "set_menu";
export type OfferStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "archived";

export interface Offer {
  id: string;
  name: string;
  kind: OfferKind;
  /** Percent points for `percent`, MAD for `amount` and `set_menu`. */
  value: number;
  freeItemLabel: string;
  weekdays: number[];
  serviceIds: string[];
  startsOn: string;
  endsOn: string;
  /** 0 means uncapped. */
  coverCap: number;
  minParty: number;
  prepaymentRequired: boolean;
  channel: string;
  status: OfferStatus;
  /** Counted from redemptions, never estimated. */
  reservationsAttributed: number;
  coversAttributed: number;
}

export type ExperienceStatus = "brouillon" | "publie" | "complet" | "termine";
export type TicketStatus =
  | "reserve"
  | "paye"
  | "utilise"
  | "rembourse"
  | "annule";

export interface ExperienceAddon {
  id: string;
  label: string;
  priceMad: number;
}

export interface ExperienceTicket {
  id: string;
  customerId: string | null;
  guestName: string;
  guestPhone: string;
  seats: number;
  addonIds: string[];
  amountMad: number;
  status: TicketStatus;
  qrCode: string | null;
  checkedInAt: string | null;
  purchasedAt: string;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  status: ExperienceStatus;
  startsAt: string;
  endsAt: string;
  recurrence: string;
  capacity: number;
  priceMad: number;
  /** 0 = nothing up front, 100 = full prepayment, else a deposit share. */
  prepayPercent: number;
  cancellationTerms: string;
  addons: ExperienceAddon[];
  tickets: ExperienceTicket[];
  seatsSold: number;
  revenueMad: number;
}

export interface Growth {
  offers: Offer[];
  experiences: Experience[];
}

// ── Paiements ────────────────────────────────────────────────

export type DepositMode = "none" | "imprint" | "per_person" | "full";
export type DepositAppliesTo =
  | "party_size"
  | "service"
  | "night"
  | "experience"
  | "table";
export type DepositStatus =
  | "demande"
  | "paye"
  | "libere"
  | "capture"
  | "rembourse"
  | "echoue";

export interface DepositPolicy {
  id: string;
  name: string;
  appliesTo: DepositAppliesTo;
  appliesValue: string;
  mode: DepositMode;
  amountMad: number;
  noShowFeeMad: number;
  lateCancelFeeMad: number;
  graceMinutes: number;
  enabled: boolean;
  version: number;
}

export interface Deposit {
  id: string;
  policyId: string | null;
  reservationId: string | null;
  ticketId: string | null;
  customerId: string | null;
  guestName: string;
  amountMad: number;
  status: DepositStatus;
  processorRef: string | null;
  requestedAt: string;
  paidAt: string | null;
  settledAt: string | null;
  failureReason: string;
}

export interface CancellationPolicy {
  freeUntilHours: number;
  lateFeeMad: number;
  noShowFeeMad: number;
  /** Shown to the guest in the app at booking. Previewed in Annulations. */
  guestMessage: string;
  version: number;
  updatedAt: string;
}

export interface CancellationEntry {
  id: string;
  reservationId: string | null;
  guestName: string;
  kind: "annulation" | "no_show";
  actor: "guest" | "venue" | "system";
  reason: string;
  feeMad: number;
  waived: boolean;
  disputed: boolean;
  at: string;
}

export type PaymentMethod = "wallet" | "carte" | "tpe";

export interface Transaction {
  id: string;
  customerId: string | null;
  reservationId: string | null;
  payoutId: string | null;
  amountMad: number;
  feeMad: number;
  method: PaymentMethod;
  status: "reussie" | "remboursee" | "echouee";
  processorRef: string | null;
  at: string;
}

export interface MoneyDesk {
  depositPolicies: DepositPolicy[];
  deposits: Deposit[];
  cancellationPolicy: CancellationPolicy;
  cancellations: CancellationEntry[];
  transactions: Transaction[];
  /**
   * False when the venue has no Lyfe Pay history at all. Every spend,
   * revenue and average-ticket tile keys off this and hides itself
   * rather than showing an estimate — the rule the spec states twice.
   */
  hasTransactionSource: boolean;
}

// ── Vie nocturne ─────────────────────────────────────────────

export interface GuestListBand {
  id: string;
  label: string;
  untilAt: string;
  priceMad: number;
  /** Empty for everyone; otherwise "femmes", "couples", … */
  appliesTo: string;
}

export type GuestListEntrySource = "app" | "promoteur" | "sur_place";

export interface GuestListEntry {
  id: string;
  customerId: string | null;
  guestName: string;
  guestPhone: string;
  partySize: number;
  source: GuestListEntrySource;
  promoterId: string | null;
  promoterName: string | null;
  qrCode: string | null;
  checkedInAt: string | null;
  checkedInCount: number;
  addedAt: string;
}

export interface GuestList {
  id: string;
  name: string;
  night: string;
  capacity: number;
  cutoffAt: string;
  status: "ouverte" | "fermee";
  bands: GuestListBand[];
  entries: GuestListEntry[];
}

export interface Promoter {
  id: string;
  fullName: string;
  phone: string;
  code: string;
  commissionPercent: number;
  active: boolean;
  entriesBrought: number;
  guestsBrought: number;
  checkedIn: number;
  tablesBrought: number;
  /** Null where no transaction source exists, so the tile hides. */
  revenueAttributedMad: number | null;
}

export interface TableType {
  id: string;
  name: string;
  count: number;
  minGuests: number;
  maxGuests: number;
  depositPercent: number;
  packageLabel: string;
  cancellationHours: number;
  /** Minimum spend by night kind: semaine, weekend, evenement. */
  minimums: { nightKind: string; minimumMad: number }[];
}

export type TableReservationStatus =
  | "demandee"
  | "confirmee"
  | "arrivee"
  | "liberee"
  | "annulee";

export interface TableReservation {
  id: string;
  tableTypeId: string;
  tableTypeName: string;
  customerId: string | null;
  promoterId: string | null;
  promoterName: string | null;
  guestName: string;
  guestPhone: string;
  partySize: number;
  night: string;
  at: string;
  minimumMad: number;
  /** Null until a source says otherwise. Never rendered as zero spend. */
  reachedMad: number | null;
  status: TableReservationStatus;
  depositId: string | null;
  depositStatus: DepositStatus | null;
}

export interface Nightlife {
  guestLists: GuestList[];
  promoters: Promoter[];
  tableTypes: TableType[];
  tableReservations: TableReservation[];
}

// ── Marketing ────────────────────────────────────────────────

export type CampaignChannel = "email" | "sms" | "whatsapp";
export type CampaignTemplate =
  | "offre"
  | "evenement"
  | "newsletter"
  | "anniversaire"
  | "win_back";
export type CampaignStatus =
  | "brouillon"
  | "programmee"
  | "envoi"
  | "envoyee"
  | "en_pause";
export type CampaignAutomation =
  | ""
  | "bienvenue"
  | "remerciement"
  | "win_back"
  | "anniversaire";

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  template: CampaignTemplate;
  segmentId: string | null;
  segmentName: string | null;
  subject: string;
  body: string;
  status: CampaignStatus;
  /** Non-empty when the campaign fires on a trigger, not a date. */
  automation: CampaignAutomation;
  scheduledFor: string | null;
  sentAt: string | null;
  /** Per recipient, in MAD. Surfaced before sending, as the spec requires. */
  unitCostMad: number;
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  reservationsAttributed: number;
  unsubscribed: number;
}

export type MessageChannel = "email" | "sms" | "whatsapp" | "push";

export interface LoggedMessage {
  id: string;
  customerId: string | null;
  campaignId: string | null;
  reservationId: string | null;
  channel: MessageChannel;
  kind: string;
  recipient: string;
  preview: string;
  status: "file" | "envoye" | "delivre" | "lu" | "echoue";
  failureReason: string;
  at: string;
}

export interface Marketing {
  campaigns: Campaign[];
  messages: LoggedMessage[];
  suppressions: { contact: string; reason: string; at: string }[];
  /** Guests who may be contacted, against the total. Drives the dashboard. */
  consent: { optedIn: number; optedOut: number; suppressed: number };
}

// ── Reviews configuration ────────────────────────────────────

export interface SurveyConfig {
  enabled: boolean;
  sendAfterHours: number;
  questions: string[];
  redirectFromRating: number;
  googleUrl: string;
  tripadvisorUrl: string;
}

// ── Establishment and account ────────────────────────────────

/**
 * Which product surfaces the establishment runs. Distinct from
 * `venues.kind`, which is what the consumer app lists the place as: a
 * restaurant with a rooftop bar is `both`.
 */
export type VenueConfiguration = "restaurant" | "lounge" | "both";

export interface VenueSettings {
  configuration: VenueConfiguration;
  legalName: string;
  ice: string;
  rc: string;
  billingAddress: string;
  iban: string;
  language: string;
  timezone: string;
  consentText: string;
  retentionMonths: number;
  googlePlaceUrl: string;
  instagramHandle: string;
  whatsappNumber: string;
  dressCode: string;
  minimumAge: number;
  apiAccessEnabled: boolean;
}

export interface Subscription {
  plan: string;
  status: "essai" | "actif" | "expire";
  trialEndsAt: string | null;
  renewsAt: string | null;
  priceMad: number;
  paymentMethod: string;
  invoices: {
    id: string;
    reference: string;
    amountMad: number;
    status: "payee" | "due" | "impayee";
    issuedOn: string;
  }[];
  /** Counted for the period, so the plan page is not a price alone. */
  usage: {
    reservations: number;
    guests: number;
    messagesSent: number;
    campaigns: number;
  };
}

export interface SupportTicket {
  id: string;
  reference: string;
  category: string;
  subject: string;
  body: string;
  status: "ouvert" | "en_cours" | "resolu";
  createdAt: string;
  updatedAt: string;
}
