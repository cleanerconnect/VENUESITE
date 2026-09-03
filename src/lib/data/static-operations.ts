import "server-only";

// The no-infrastructure driver's writes.
//
// The SQLite path applies an action with SQL; this applies the same
// action to the bundle in memory. Two implementations of one contract is
// a cost, and it is paid deliberately: a demo where pressing Installer
// does nothing is worse than no demo, because the reviewer concludes the
// button is broken rather than that the database is absent.
//
// Edits live in a per-process overlay. They do not survive a restart —
// that is what `npm run db:reset` is for — and the README says so.
//
// Every reducer is pure over its bundle and returns a new one, so an
// exception halfway through leaves the previous state intact rather than
// a half-applied write nobody can see.

import { StaleWriteError } from "./repository";
import type {
  ConfigurationAction,
  GrowthAction,
  GuestGraphAction,
  MarketingAction,
  MoneyAction,
  NightlifeAction,
  ServiceConfiguration,
  ServiceFloorAction,
} from "./repository";
import type {
  Campaign,
  Deposit,
  Experience,
  Growth,
  GuestGraph,
  GuestList,
  Marketing,
  MoneyDesk,
  Nightlife,
  Offer,
  ServiceFloor,
  WaitlistParty,
} from "@/lib/types/venue-operations";
import type { GuestEvent, OutboundGateway } from "@/lib/integrations/outbound";
import { emitGuestEvent } from "@/lib/integrations/outbound";

const nowIso = () => new Date().toISOString();
const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Records the message the action would have sent, then emits both
 * halves. Same helper as the SQL path's, for the same reason: the log
 * row, the notification and the tracking event must not be able to come
 * apart at one call site.
 */
async function emitAndLog(
  gateway: OutboundGateway,
  venueId: string,
  marketing: Marketing,
  event: Omit<GuestEvent, "venueId">,
  properties: Record<string, string | number | boolean> = {},
): Promise<Marketing> {
  await emitGuestEvent(gateway, { venueId, ...event }, properties);
  return {
    ...marketing,
    messages: [
      {
        id: newId("ml"),
        customerId: event.customerId,
        campaignId: null,
        reservationId: null,
        channel: event.channel,
        kind: event.kind,
        recipient: event.recipient,
        preview: event.preview,
        status: "envoye" as const,
        failureReason: "",
        at: event.at,
      },
      ...marketing.messages,
    ],
  };
}

// ── Service floor ────────────────────────────────────────────

/**
 * Seating and converting create records outside the service floor — a
 * customer, and a message. The reducer returns them rather than reaching
 * for them, so the caller stays the only thing that owns the overlay.
 */
export interface ServiceFloorResult {
  floor: ServiceFloor;
  /** Emitted alongside; folded into the marketing bundle by the caller. */
  guestEvent?: Omit<GuestEvent, "venueId">;
  eventProperties?: Record<string, string | number | boolean>;
  /** A guest the action created, for the caller to add to the CRM. */
  createdCustomer?: { name: string; phone: string };
}

export function applyServiceFloor(
  floor: ServiceFloor,
  action: ServiceFloorAction,
): ServiceFloorResult {
  const at = nowIso();
  const patch = (id: string, fn: (p: WaitlistParty) => WaitlistParty) => ({
    ...floor,
    waitlist: floor.waitlist.map((p) => (p.id === id ? fn(p) : p)),
  });
  const find = (id: string) => {
    const party = floor.waitlist.find((p) => p.id === id);
    if (!party) throw new StaleWriteError("Partie en attente");
    return party;
  };

  switch (action.kind) {
    case "waitlist.add":
      return {
        floor: {
          ...floor,
          waitlist: [
            ...floor.waitlist,
            {
              id: newId("wl"),
              customerId: null,
              guestName: action.guestName.trim(),
              guestPhone: action.guestPhone.trim(),
              partySize: action.partySize,
              quotedMinutes: action.quotedMinutes,
              addedAt: at,
              notifiedAt: null,
              seatedAt: null,
              removedAt: null,
              source: action.source,
              status: "waiting",
              removalReason: null,
              note: "",
              reservationId: null,
            },
          ],
        },
      };

    case "waitlist.notify": {
      const party = find(action.id);
      return {
        floor: patch(action.id, (p) => ({ ...p, status: "notified", notifiedAt: at })),
        guestEvent: {
          kind: "waitlist.notified",
          subjectId: action.id,
          customerId: party.customerId,
          recipient: party.guestPhone,
          channel: "whatsapp",
          preview: `Votre table pour ${party.partySize} est prête. Présentez-vous à l'accueil.`,
          at,
        },
        eventProperties: { partySize: party.partySize },
      };
    }

    case "waitlist.seat": {
      const party = find(action.id);
      const reservationId = newId("res");
      return {
        floor: patch(action.id, (p) => ({
          ...p,
          status: "seated",
          seatedAt: at,
          reservationId,
        })),
        // Seating creates the booking, so the CRM sees the visit — the
        // one thing the spec says a walk-in must not lose.
        createdCustomer: { name: party.guestName, phone: party.guestPhone },
        guestEvent: {
          kind: "waitlist.seated",
          subjectId: reservationId,
          customerId: party.customerId,
          recipient: party.guestPhone,
          channel: "push",
          preview: `Bonne dégustation ! Votre table de ${party.partySize} est installée.`,
          at,
        },
        eventProperties: { partySize: party.partySize },
      };
    }

    case "waitlist.remove":
      return {
        floor: patch(action.id, (p) => ({
          ...p,
          status: "left",
          removedAt: at,
          removalReason: action.reason,
        })),
      };

    case "waitlist.requote":
      return {
        floor: patch(action.id, (p) => ({ ...p, quotedMinutes: action.quotedMinutes })),
      };

    case "waitlist.convert": {
      const party = find(action.id);
      const reservationId = newId("res");
      return {
        floor: patch(action.id, (p) => ({
          ...p,
          status: "left",
          removedAt: at,
          removalReason: "doublon",
          reservationId,
        })),
        createdCustomer: { name: party.guestName, phone: party.guestPhone },
        guestEvent: {
          kind: "reservation.confirmed",
          subjectId: reservationId,
          customerId: party.customerId,
          recipient: party.guestPhone,
          channel: "whatsapp",
          preview: `Votre table de ${party.partySize} est réservée. À très vite.`,
          at,
        },
        eventProperties: { partySize: party.partySize, converted: true },
      };
    }

    case "waitlist.settings":
      return {
        floor: {
          ...floor,
          waitlistSettings: {
            onlineOpen: action.onlineOpen,
            maxPartyOnline: action.maxPartyOnline,
            defaultQuoteMinutes: action.defaultQuoteMinutes,
            pausedReason: action.pausedReason,
            updatedAt: at,
          },
        },
      };

    case "shiftNote.add":
      return {
        floor: {
          ...floor,
          briefing: {
            ...floor.briefing,
            notes: [
              {
                id: newId("sn"),
                serviceId: floor.briefing.serviceId,
                date: floor.briefing.date,
                authorId: "venue",
                author: "Manager",
                body: action.body.trim(),
                pinned: action.pinned,
                createdAt: at,
              },
              ...floor.briefing.notes,
            ],
          },
        },
      };

    case "calendar.close":
      return {
        floor: {
          ...floor,
          calendar: floor.calendar.map((d) =>
            d.date === action.date
              ? { ...d, closed: true, closureReason: action.reason }
              : d,
          ),
        },
      };

    case "calendar.open":
      return {
        floor: {
          ...floor,
          calendar: floor.calendar.map((d) =>
            d.date === action.date ? { ...d, closed: false, closureReason: "" } : d,
          ),
        },
      };

    case "calendar.capacity":
      return {
        floor: {
          ...floor,
          calendar: floor.calendar.map((d) =>
            d.date === action.date
              ? {
                  ...d,
                  capacity: action.capacity,
                  capacityOverride: action.capacity,
                  capacityNote: action.note,
                }
              : d,
          ),
        },
      };
  }
}

// ── Guest vocabulary ─────────────────────────────────────────

export function applyGuestGraph(graph: GuestGraph, action: GuestGraphAction): GuestGraph {
  switch (action.kind) {
    case "tag.create":
      return {
        ...graph,
        tags: [
          ...graph.tags,
          {
            id: newId("tg"),
            label: action.label.trim(),
            colour: action.colour,
            origin: "manual",
            staffVisible: action.staffVisible,
            archived: false,
            usageCount: 0,
          },
        ],
      };
    case "tag.update":
      return {
        ...graph,
        tags: graph.tags.map((t) =>
          t.id === action.id
            ? {
                ...t,
                label: action.label.trim(),
                colour: action.colour,
                staffVisible: action.staffVisible,
              }
            : t,
        ),
      };
    case "tag.archive":
      // Archived, never removed: deleting a tag would take the history
      // of everyone carrying it.
      return {
        ...graph,
        tags: graph.tags.map((t) => (t.id === action.id ? { ...t, archived: true } : t)),
      };
    case "tag.apply": {
      const byCustomer = { ...graph.tagsByCustomer };
      for (const id of action.customerIds) {
        const held = byCustomer[id] ?? [];
        if (!held.includes(action.tagId)) byCustomer[id] = [...held, action.tagId];
      }
      return {
        ...graph,
        tagsByCustomer: byCustomer,
        tags: graph.tags.map((t) =>
          t.id === action.tagId
            ? { ...t, usageCount: countUsage(byCustomer, t.id) }
            : t,
        ),
      };
    }
    case "tag.remove": {
      const byCustomer = { ...graph.tagsByCustomer };
      byCustomer[action.customerId] = (byCustomer[action.customerId] ?? []).filter(
        (id) => id !== action.tagId,
      );
      return {
        ...graph,
        tagsByCustomer: byCustomer,
        tags: graph.tags.map((t) =>
          t.id === action.tagId
            ? { ...t, usageCount: countUsage(byCustomer, t.id) }
            : t,
        ),
      };
    }
    case "rule.update":
      return {
        ...graph,
        rules: graph.rules.map((r) =>
          r.id === action.id
            ? {
                ...r,
                threshold: action.threshold,
                windowDays: action.windowDays,
                enabled: action.enabled,
              }
            : r,
        ),
      };
    case "segment.create":
      return {
        ...graph,
        segments: [
          ...graph.segments,
          {
            id: newId("sg"),
            name: action.name.trim(),
            description: action.description.trim(),
            criteria: action.criteria,
            memberCount: action.memberCount,
            updatedAt: nowIso(),
          },
        ],
      };
    case "segment.delete":
      return { ...graph, segments: graph.segments.filter((s) => s.id !== action.id) };
  }
}

const countUsage = (byCustomer: Record<string, string[]>, tagId: string) =>
  Object.values(byCustomer).filter((ids) => ids.includes(tagId)).length;

// ── Growth ───────────────────────────────────────────────────

export interface GrowthResult {
  growth: Growth;
  /** One per ticket holder when an experience is published. */
  guestEvents?: { event: Omit<GuestEvent, "venueId">; properties: Record<string, string | number | boolean> }[];
}

export function applyGrowth(growth: Growth, action: GrowthAction): GrowthResult {
  const at = nowIso();

  switch (action.kind) {
    case "offer.save": {
      const o = action.offer;
      const next: Offer = {
        id: o.id ?? newId("of"),
        name: o.name.trim(),
        kind: o.kind,
        value: o.value,
        freeItemLabel: o.freeItemLabel.trim(),
        weekdays: o.weekdays,
        serviceIds: o.serviceIds,
        startsOn: o.startsOn,
        endsOn: o.endsOn,
        coverCap: o.coverCap,
        minParty: o.minParty,
        prepaymentRequired: o.prepaymentRequired,
        channel: "app",
        status: o.status,
        // Attribution belongs to redemptions, so an edit never invents it.
        reservationsAttributed:
          growth.offers.find((x) => x.id === o.id)?.reservationsAttributed ?? 0,
        coversAttributed: growth.offers.find((x) => x.id === o.id)?.coversAttributed ?? 0,
      };
      return {
        growth: {
          ...growth,
          offers: growth.offers.some((x) => x.id === next.id)
            ? growth.offers.map((x) => (x.id === next.id ? next : x))
            : [next, ...growth.offers],
        },
      };
    }

    case "offer.status":
      return {
        growth: {
          ...growth,
          offers: growth.offers.map((o) =>
            o.id === action.id ? { ...o, status: action.status } : o,
          ),
        },
      };

    case "offer.duplicate": {
      const source = growth.offers.find((o) => o.id === action.id);
      if (!source) throw new StaleWriteError("Offre");
      return {
        growth: {
          ...growth,
          offers: [
            {
              ...source,
              id: newId("of"),
              name: `${source.name} (copie)`,
              status: "draft",
              reservationsAttributed: 0,
              coversAttributed: 0,
            },
            ...growth.offers,
          ],
        },
      };
    }

    case "experience.save": {
      const x = action.experience;
      const existing = growth.experiences.find((e) => e.id === x.id);
      const next: Experience = {
        id: x.id ?? newId("xp"),
        title: x.title.trim(),
        description: x.description.trim(),
        status: x.status,
        startsAt: x.startsAt,
        endsAt: x.endsAt,
        recurrence: existing?.recurrence ?? "",
        capacity: x.capacity,
        priceMad: x.priceMad,
        prepayPercent: x.prepayPercent,
        cancellationTerms: x.cancellationTerms.trim(),
        addons: x.addons.map((a) => ({
          id: newId("ad"),
          label: a.label.trim(),
          priceMad: a.priceMad,
        })),
        tickets: existing?.tickets ?? [],
        seatsSold: existing?.seatsSold ?? 0,
        revenueMad: existing?.revenueMad ?? 0,
      };
      return {
        growth: {
          ...growth,
          experiences: existing
            ? growth.experiences.map((e) => (e.id === next.id ? next : e))
            : [next, ...growth.experiences],
        },
      };
    }

    case "experience.status": {
      const experience = growth.experiences.find((e) => e.id === action.id);
      return {
        growth: {
          ...growth,
          experiences: growth.experiences.map((e) =>
            e.id === action.id ? { ...e, status: action.status } : e,
          ),
        },
        // Publishing puts the experience in the app, so its ticket
        // holders hear about it like any other booking change.
        guestEvents:
          action.status === "publie" && experience
            ? experience.tickets
                .filter((t) => t.status === "reserve" || t.status === "paye")
                .map((t) => ({
                  event: {
                    kind: "experience.booked" as const,
                    subjectId: t.id,
                    customerId: t.customerId,
                    recipient: t.guestPhone,
                    channel: "push" as const,
                    preview:
                      "Votre expérience est confirmée. Retrouvez votre billet dans l'app.",
                    at,
                  },
                  properties: { experienceId: action.id },
                }))
            : undefined,
      };
    }
  }
}

// ── Vie nocturne ─────────────────────────────────────────────

export interface NightlifeResult {
  nightlife: Nightlife;
  guestEvent?: Omit<GuestEvent, "venueId">;
  eventProperties?: Record<string, string | number | boolean>;
  createdCustomer?: { name: string; phone: string };
  /** A deposit the action raised, for the caller to add to the ledger. */
  createdDeposit?: Deposit;
}

export function applyNightlife(
  nightlife: Nightlife,
  action: NightlifeAction,
): NightlifeResult {
  const at = nowIso();
  const patchList = (id: string, fn: (l: GuestList) => GuestList): Nightlife => ({
    ...nightlife,
    guestLists: nightlife.guestLists.map((l) => (l.id === id ? fn(l) : l)),
  });
  const findTable = (id: string) => {
    const table = nightlife.tableReservations.find((t) => t.id === id);
    if (!table) throw new StaleWriteError("Table");
    return table;
  };

  switch (action.kind) {
    case "guestList.status":
      return { nightlife: patchList(action.id, (l) => ({ ...l, status: action.status })) };

    case "guestList.addEntry": {
      const id = newId("gle");
      return {
        nightlife: patchList(action.guestListId, (l) => ({
          ...l,
          entries: [
            ...l.entries,
            {
              id,
              customerId: null,
              guestName: action.guestName.trim(),
              guestPhone: action.guestPhone.trim(),
              partySize: action.partySize,
              source: action.source,
              promoterId: action.promoterId,
              promoterName:
                nightlife.promoters.find((p) => p.id === action.promoterId)?.fullName ??
                null,
              qrCode: `LYFE-${id.toUpperCase()}`,
              checkedInAt: null,
              checkedInCount: 0,
              addedAt: at,
            },
          ],
        })),
      };
    }

    case "guestList.checkIn": {
      const list = nightlife.guestLists.find((l) =>
        l.entries.some((e) => e.id === action.entryId),
      );
      const entry = list?.entries.find((e) => e.id === action.entryId);
      if (!list || !entry) throw new StaleWriteError("Entrée");
      // Refusing the replay is the point of a door scanner: a code that
      // works twice is a code that works for everyone.
      if (entry.checkedInAt) throw new StaleWriteError("Entrée déjà validée");

      return {
        nightlife: patchList(list.id, (l) => ({
          ...l,
          entries: l.entries.map((e) =>
            e.id === action.entryId
              ? { ...e, checkedInAt: at, checkedInCount: action.count }
              : e,
          ),
        })),
        // The spec is explicit: a door check-in creates a guest record.
        createdCustomer: { name: entry.guestName, phone: entry.guestPhone },
        guestEvent: {
          kind: "guestlist.checked_in",
          subjectId: entry.id,
          customerId: entry.customerId,
          recipient: entry.guestPhone,
          channel: "push",
          preview: "Bienvenue ! Votre entrée est validée.",
          at,
        },
        eventProperties: { count: action.count, source: entry.source },
      };
    }

    case "guestList.undoCheckIn": {
      const list = nightlife.guestLists.find((l) =>
        l.entries.some((e) => e.id === action.entryId),
      );
      if (!list) throw new StaleWriteError("Entrée");
      return {
        nightlife: patchList(list.id, (l) => ({
          ...l,
          entries: l.entries.map((e) =>
            e.id === action.entryId ? { ...e, checkedInAt: null, checkedInCount: 0 } : e,
          ),
        })),
      };
    }

    case "tableType.save": {
      const id = action.id ?? newId("tt");
      const existing = nightlife.tableTypes.find((t) => t.id === id);
      const next = {
        id,
        name: action.name.trim(),
        count: action.count,
        minGuests: action.minGuests,
        maxGuests: action.maxGuests,
        depositPercent: action.depositPercent,
        packageLabel: action.packageLabel.trim(),
        cancellationHours: action.cancellationHours,
        minimums: existing?.minimums ?? [],
      };
      return {
        nightlife: {
          ...nightlife,
          tableTypes: existing
            ? nightlife.tableTypes.map((t) => (t.id === id ? next : t))
            : [...nightlife.tableTypes, next],
        },
      };
    }

    case "tableOffer.save":
      return {
        nightlife: {
          ...nightlife,
          tableTypes: nightlife.tableTypes.map((t) =>
            t.id === action.tableTypeId
              ? {
                  ...t,
                  minimums: t.minimums.some((m) => m.nightKind === action.nightKind)
                    ? t.minimums.map((m) =>
                        m.nightKind === action.nightKind
                          ? { ...m, minimumMad: action.minimumMad }
                          : m,
                      )
                    : [
                        ...t.minimums,
                        { nightKind: action.nightKind, minimumMad: action.minimumMad },
                      ],
                }
              : t,
          ),
        },
      };

    case "table.confirm": {
      const table = findTable(action.id);
      return {
        nightlife: {
          ...nightlife,
          tableReservations: nightlife.tableReservations.map((t) =>
            t.id === action.id ? { ...t, status: "confirmee" as const } : t,
          ),
        },
        guestEvent: {
          kind: "table.confirmed",
          subjectId: action.id,
          customerId: table.customerId,
          recipient: table.guestPhone,
          channel: "whatsapp",
          preview: `Votre table est confirmée pour le ${table.night}. Minimum ${table.minimumMad} MAD.`,
          at,
        },
        eventProperties: { minimumMad: table.minimumMad, partySize: table.partySize },
      };
    }

    case "table.requestDeposit": {
      const table = findTable(action.id);
      const percent =
        nightlife.tableTypes.find((t) => t.id === table.tableTypeId)?.depositPercent ?? 0;
      const amount = Math.round((table.minimumMad * percent) / 100);
      const depositId = newId("dep");
      return {
        nightlife: {
          ...nightlife,
          tableReservations: nightlife.tableReservations.map((t) =>
            t.id === action.id
              ? { ...t, depositId, depositStatus: "demande" as const }
              : t,
          ),
        },
        createdDeposit: {
          id: depositId,
          policyId: null,
          reservationId: null,
          ticketId: null,
          customerId: table.customerId,
          guestName: table.guestName,
          amountMad: amount,
          status: "demande",
          processorRef: null,
          requestedAt: at,
          paidAt: null,
          settledAt: null,
          failureReason: "",
        },
        guestEvent: {
          kind: "deposit.requested",
          subjectId: depositId,
          customerId: table.customerId,
          recipient: table.guestPhone,
          channel: "whatsapp",
          preview: `Merci de régler l'acompte de ${amount} MAD pour confirmer votre table.`,
          at,
        },
        eventProperties: { amountMad: amount, percent },
      };
    }

    case "table.markReached":
      return {
        nightlife: {
          ...nightlife,
          tableReservations: nightlife.tableReservations.map((t) =>
            t.id === action.id
              ? { ...t, reachedMad: action.amountMad, status: "arrivee" as const }
              : t,
          ),
        },
      };

    case "table.release":
      return {
        nightlife: {
          ...nightlife,
          tableReservations: nightlife.tableReservations.map((t) =>
            t.id === action.id ? { ...t, status: "liberee" as const } : t,
          ),
        },
      };

    case "promoter.save": {
      const id = action.id ?? newId("pr");
      const existing = nightlife.promoters.find((p) => p.id === id);
      return {
        nightlife: {
          ...nightlife,
          promoters: existing
            ? nightlife.promoters.map((p) =>
                p.id === id
                  ? {
                      ...p,
                      fullName: action.fullName.trim(),
                      phone: action.phone.trim(),
                      commissionPercent: action.commissionPercent,
                    }
                  : p,
              )
            : [
                ...nightlife.promoters,
                {
                  id,
                  fullName: action.fullName.trim(),
                  phone: action.phone.trim(),
                  code: slug(action.fullName),
                  commissionPercent: action.commissionPercent,
                  active: true,
                  entriesBrought: 0,
                  guestsBrought: 0,
                  checkedIn: 0,
                  tablesBrought: 0,
                  revenueAttributedMad: null,
                },
              ],
        },
      };
    }

    case "promoter.setActive":
      return {
        nightlife: {
          ...nightlife,
          promoters: nightlife.promoters.map((p) =>
            p.id === action.id ? { ...p, active: action.active } : p,
          ),
        },
      };
  }
}

// ── Money ────────────────────────────────────────────────────

export interface MoneyResult {
  money: MoneyDesk;
  guestEvent?: Omit<GuestEvent, "venueId">;
  eventProperties?: Record<string, string | number | boolean>;
}

/** Idempotency keys already spent this process. */
const spentKeys = new Set<string>();

export function applyMoney(money: MoneyDesk, action: MoneyAction): MoneyResult {
  const at = nowIso();
  const findDeposit = (id: string) => {
    const deposit = money.deposits.find((d) => d.id === id);
    if (!deposit) throw new StaleWriteError("Acompte");
    return deposit;
  };

  switch (action.kind) {
    case "depositPolicy.save": {
      const id = action.id ?? newId("dp");
      const existing = money.depositPolicies.find((p) => p.id === id);
      if (
        existing &&
        action.expectedVersion !== null &&
        existing.version !== action.expectedVersion
      ) {
        // A deposit rule decides whether a guest is charged. A lost
        // update is money taken under a rule nobody chose.
        throw new StaleWriteError("Règle d'acompte");
      }
      const next = {
        id,
        name: action.name.trim(),
        appliesTo: action.appliesTo,
        appliesValue: action.appliesValue,
        mode: action.mode,
        amountMad: action.amountMad,
        noShowFeeMad: action.noShowFeeMad,
        lateCancelFeeMad: action.lateCancelFeeMad,
        graceMinutes: action.graceMinutes,
        enabled: action.enabled,
        version: (existing?.version ?? 0) + 1,
      };
      return {
        money: {
          ...money,
          depositPolicies: existing
            ? money.depositPolicies.map((p) => (p.id === id ? next : p))
            : [...money.depositPolicies, next],
        },
      };
    }

    case "deposit.chase": {
      const deposit = findDeposit(action.id);
      return {
        money,
        guestEvent: {
          kind: "deposit.requested",
          subjectId: action.id,
          customerId: deposit.customerId,
          recipient: deposit.guestName,
          channel: "whatsapp",
          preview: `Rappel : l'acompte de ${deposit.amountMad} MAD reste à régler.`,
          at,
        },
        eventProperties: { amountMad: deposit.amountMad, reminder: true },
      };
    }

    case "deposit.capture":
    case "deposit.release":
    case "deposit.refund": {
      const deposit = findDeposit(action.id);
      // The processor is idempotent on this key, so this is too: a
      // replayed request is refused rather than moving money twice.
      if (spentKeys.has(action.idempotencyKey)) {
        throw new StaleWriteError("Mouvement déjà enregistré");
      }
      spentKeys.add(action.idempotencyKey);

      const status =
        action.kind === "deposit.capture"
          ? ("capture" as const)
          : action.kind === "deposit.release"
            ? ("libere" as const)
            : ("rembourse" as const);

      return {
        money: {
          ...money,
          deposits: money.deposits.map((d) =>
            d.id === action.id ? { ...d, status, settledAt: at } : d,
          ),
        },
        guestEvent:
          action.kind === "deposit.release"
            ? undefined
            : {
                kind:
                  action.kind === "deposit.capture"
                    ? "deposit.captured"
                    : "deposit.refunded",
                subjectId: action.id,
                customerId: deposit.customerId,
                recipient: deposit.guestName,
                channel: "push",
                preview:
                  action.kind === "deposit.capture"
                    ? `L'acompte de ${deposit.amountMad} MAD a été prélevé.`
                    : `L'acompte de ${deposit.amountMad} MAD vous a été remboursé.`,
                at,
              },
        eventProperties: { amountMad: deposit.amountMad },
      };
    }

    case "cancellationPolicy.save":
      if (money.cancellationPolicy.version !== action.expectedVersion) {
        throw new StaleWriteError("Politique d'annulation");
      }
      return {
        money: {
          ...money,
          cancellationPolicy: {
            freeUntilHours: action.freeUntilHours,
            lateFeeMad: action.lateFeeMad,
            noShowFeeMad: action.noShowFeeMad,
            guestMessage: action.guestMessage.trim(),
            version: money.cancellationPolicy.version + 1,
            updatedAt: at,
          },
        },
      };

    case "cancellation.waive":
      return {
        money: {
          ...money,
          cancellations: money.cancellations.map((c) =>
            c.id === action.id ? { ...c, waived: true } : c,
          ),
        },
      };

    case "cancellation.dispute":
      return {
        money: {
          ...money,
          cancellations: money.cancellations.map((c) =>
            c.id === action.id ? { ...c, disputed: action.disputed } : c,
          ),
        },
      };

    case "transaction.link":
      return {
        money: {
          ...money,
          transactions: money.transactions.map((t) =>
            t.id === action.id ? { ...t, reservationId: action.reservationId } : t,
          ),
        },
      };
  }
}

// ── Marketing ────────────────────────────────────────────────

export interface MarketingResult {
  marketing: Marketing;
  guestEvent?: Omit<GuestEvent, "venueId">;
  eventProperties?: Record<string, string | number | boolean>;
}

export function applyMarketing(
  marketing: Marketing,
  action: MarketingAction,
): MarketingResult {
  const at = nowIso();
  const unitCost = (channel: Campaign["channel"]) =>
    channel === "email" ? 0.02 : channel === "sms" ? 0.35 : 0.18;

  switch (action.kind) {
    case "campaign.save": {
      const c = action.campaign;
      const existing = marketing.campaigns.find((x) => x.id === c.id);
      const next: Campaign = {
        id: c.id ?? newId("cp"),
        name: c.name.trim(),
        channel: c.channel,
        template: c.template,
        segmentId: c.segmentId,
        segmentName: existing?.segmentName ?? null,
        subject: c.subject.trim(),
        body: c.body,
        status: c.scheduledFor ? "programmee" : "brouillon",
        automation: c.automation,
        scheduledFor: c.scheduledFor,
        sentAt: existing?.sentAt ?? null,
        unitCostMad: unitCost(c.channel),
        recipients: existing?.recipients ?? 0,
        delivered: existing?.delivered ?? 0,
        opened: existing?.opened ?? 0,
        clicked: existing?.clicked ?? 0,
        reservationsAttributed: existing?.reservationsAttributed ?? 0,
        unsubscribed: existing?.unsubscribed ?? 0,
      };
      return {
        marketing: {
          ...marketing,
          campaigns: existing
            ? marketing.campaigns.map((x) => (x.id === next.id ? next : x))
            : [next, ...marketing.campaigns],
        },
      };
    }

    case "campaign.status": {
      const campaign = marketing.campaigns.find((c) => c.id === action.id);
      return {
        marketing: {
          ...marketing,
          campaigns: marketing.campaigns.map((c) =>
            c.id === action.id
              ? {
                  ...c,
                  status: action.status,
                  sentAt: action.status === "envoyee" ? at : c.sentAt,
                }
              : c,
          ),
        },
        guestEvent:
          action.status === "envoyee" && campaign
            ? {
                kind: "campaign.sent",
                subjectId: action.id,
                customerId: null,
                recipient: campaign.segmentName ?? "segment",
                channel: campaign.channel,
                preview: campaign.subject,
                at,
              }
            : undefined,
        eventProperties: { recipients: campaign?.recipients ?? 0 },
      };
    }

    case "campaign.duplicate": {
      const source = marketing.campaigns.find((c) => c.id === action.id);
      if (!source) throw new StaleWriteError("Campagne");
      return {
        marketing: {
          ...marketing,
          campaigns: [
            {
              ...source,
              id: newId("cp"),
              name: `${source.name} (copie)`,
              status: "brouillon",
              sentAt: null,
              scheduledFor: null,
              recipients: 0,
              delivered: 0,
              opened: 0,
              clicked: 0,
              reservationsAttributed: 0,
              unsubscribed: 0,
            },
            ...marketing.campaigns,
          ],
        },
      };
    }

    case "campaign.test": {
      const campaign = marketing.campaigns.find((c) => c.id === action.id);
      // A test is a real message to one address, logged like any other —
      // otherwise the log lies about what left the building.
      return {
        marketing: {
          ...marketing,
          messages: [
            {
              id: newId("ml"),
              customerId: null,
              campaignId: action.id,
              reservationId: null,
              channel: campaign?.channel ?? "email",
              kind: "test",
              recipient: action.recipient.trim(),
              preview: campaign?.subject ?? "",
              status: "envoye",
              failureReason: "",
              at,
            },
            ...marketing.messages,
          ],
        },
      };
    }

    case "suppression.add": {
      const contact = action.contact.trim();
      const suppressions = marketing.suppressions.some((s) => s.contact === contact)
        ? marketing.suppressions
        : [{ contact, reason: action.reason.trim(), at }, ...marketing.suppressions];
      return {
        marketing: {
          ...marketing,
          suppressions,
          consent: { ...marketing.consent, suppressed: suppressions.length },
        },
      };
    }
  }
}

// ── Availability configuration ───────────────────────────────

export function applyConfiguration(
  config: ServiceConfiguration,
  action: ConfigurationAction,
): ServiceConfiguration {
  const at = nowIso();

  switch (action.kind) {
    case "service.save": {
      const id = action.id ?? newId("sd");
      const existing = config.services.find((s) => s.id === id);
      if (
        existing &&
        action.expectedVersion !== null &&
        existing.version !== action.expectedVersion
      ) {
        // This is the edit that changes what the app offers right now.
        throw new StaleWriteError("Service");
      }
      const next = {
        id,
        name: action.name.trim(),
        kind: action.kindLabel,
        weekdays: action.weekdays,
        startsAt: action.startsAt,
        endsAt: action.endsAt,
        lastBookingAt: action.lastBookingAt,
        capacityCovers: action.capacityCovers,
        coversPerQuarter: action.coversPerQuarter,
        turnMinutesSmall: action.turnMinutesSmall,
        turnMinutesLarge: action.turnMinutesLarge,
        zoneIds: action.zoneIds,
        enabled: action.enabled,
        version: (existing?.version ?? 0) + 1,
        updatedAt: at,
      };
      return {
        ...config,
        services: existing
          ? config.services.map((s) => (s.id === id ? next : s))
          : [...config.services, next],
      };
    }

    case "service.remove":
      return { ...config, services: config.services.filter((s) => s.id !== action.id) };

    case "pacing.save":
      if (config.pacing.version !== action.expectedVersion) {
        throw new StaleWriteError("Règles de cadence");
      }
      return {
        ...config,
        pacing: {
          maxArrivalsPerQuarter: action.maxArrivalsPerQuarter,
          maxCoversPerService: action.maxCoversPerService,
          maxPartyOnline: action.maxPartyOnline,
          minPartyOnline: action.minPartyOnline,
          requestOnlyAbove: action.requestOnlyAbove,
          bookingWindowDays: action.bookingWindowDays,
          sameDayCutoff: action.sameDayCutoff,
          minLeadMinutes: action.minLeadMinutes,
          onlineBookingOpen: action.onlineBookingOpen,
          reopenAt: action.reopenAt,
          version: config.pacing.version + 1,
          updatedAt: at,
        },
      };
  }
}

/** Shared with the SQL path: a promoter's stable share-link segment. */
function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export { emitAndLog };
