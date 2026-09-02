"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import type {
  RestaurantActivityItem,
  RestaurantOverview,
} from "@/lib/types/restaurant";

// Optimistic service state.
//
// The dashboard's actions have to *land*. Seating a party that leaves the
// floor plan unchanged reads as a mock, and a manager mid-rush will not
// wait for a round trip to see the table go orange.
//
// So the client owns a copy of the overview payload, mutations apply to
// it immediately, and the screen specs — pure functions of that payload —
// re-derive. Every mutation pushes the prior payload onto an undo stack,
// which is what lets the toast offer a real "Annuler" rather than a
// decorative one. In production the same mutation fires the API call and
// reconciles or rolls back on the response; the shape here is already
// correct for that.

interface RestaurantState {
  data: RestaurantOverview | null;
  /** Snapshots, newest last. Bounded — this is undo, not history. */
  past: RestaurantOverview[];

  hydrate: (data: RestaurantOverview) => void;
  undo: () => void;

  seatReservation: (id: string) => void;
  confirmReservation: (id: string) => void;
  cancelReservation: (id: string) => void;
  /** Venue refused the request. Distinct from a guest cancelling. */
  rejectReservation: (id: string, reasonLabel: string) => void;
  /** Guest never arrived. Also writes per-customer history server-side. */
  reportNoShow: (id: string) => void;
  clearTable: (id: string) => void;
  /** Moves the head of the waitlist onto the first table that can take it. */
  seatNextWaiting: () => { seated: string; table: string } | null;
}

const UNDO_DEPTH = 10;

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  data: null,
  past: [],

  // Seeded from the server payload on mount. Re-seeding on a later
  // navigation must not clobber local mutations, so the caller guards it.
  hydrate: (data) => set({ data, past: [] }),

  undo: () =>
    set((s) => {
      const previous = s.past[s.past.length - 1];
      if (!previous) return s;
      return { data: previous, past: s.past.slice(0, -1) };
    }),

  seatReservation: (id) =>
    mutate(set, get, (draft) => {
      const reservation = findReservation(draft, id);
      if (!reservation || reservation.state === "seated") return null;

      const table =
        draft.tables.find((t) => t.reservationId === id) ??
        draft.tables.find(
          (t) => t.state === "free" && t.seats >= reservation.partySize,
        );
      if (!table) return null;

      reservation.state = "seated";
      reservation.tableCode = table.code;
      reservation.zoneId = table.zoneId;

      table.state = "seated";
      table.reservationId = reservation.id;
      table.seatedAt = new Date().toISOString();
      table.billMad = 0;

      draft.waitlist = draft.waitlist.filter((r) => r.id !== id);
      draft.currentService.seatedCovers += reservation.partySize;

      pushActivity(draft, {
        type: "party_seated",
        actor: "Salle",
        message: `a installé ${reservation.guestName} en ${table.code} · ${reservation.partySize} couverts`,
        tableCode: table.code,
      });
      return `${reservation.guestName} installé en ${table.code}`;
    }),

  confirmReservation: (id) =>
    mutate(set, get, (draft) => {
      const reservation = findReservation(draft, id);
      if (!reservation || reservation.state !== "requested") return null;
      reservation.state = "confirmed";
      pushActivity(draft, {
        type: "reservation_created",
        actor: reservation.guestName,
        message: `voit sa table de ${reservation.partySize} confirmée`,
        reservationId: reservation.id,
      });
      return `Réservation de ${reservation.guestName} confirmée`;
    }),

  cancelReservation: (id) =>
    mutate(set, get, (draft) => {
      const reservation = findReservation(draft, id);
      if (!reservation || reservation.state === "cancelled") return null;

      const wasBooked =
        reservation.state === "confirmed" || reservation.state === "requested";
      reservation.state = "cancelled";

      // A cancelled party releases the table it was holding.
      const table = draft.tables.find((t) => t.reservationId === id);
      if (table && table.state === "reserved") {
        table.state = "free";
        delete table.reservationId;
      }

      draft.upcomingReservations = draft.upcomingReservations.filter(
        (r) => r.id !== id,
      );
      draft.waitlist = draft.waitlist.filter((r) => r.id !== id);
      if (wasBooked) {
        draft.currentService.bookedCovers = Math.max(
          0,
          draft.currentService.bookedCovers - reservation.partySize,
        );
      }

      pushActivity(draft, {
        type: "reservation_cancelled",
        actor: reservation.guestName,
        message: `a annulé sa table de ${reservation.partySize}`,
        needsAttention: true,
      });
      return `Réservation de ${reservation.guestName} annulée`;
    }),

  rejectReservation: (id, reasonLabel) =>
    mutate(set, get, (draft) => {
      const reservation = findReservation(draft, id);
      if (!reservation) return null;

      reservation.state = "cancelled";
      const table = draft.tables.find((t) => t.reservationId === id);
      if (table && table.state === "reserved") {
        table.state = "free";
        delete table.reservationId;
      }
      draft.upcomingReservations = draft.upcomingReservations.filter(
        (r) => r.id !== id,
      );
      draft.currentService.bookedCovers = Math.max(
        0,
        draft.currentService.bookedCovers - reservation.partySize,
      );

      pushActivity(draft, {
        type: "reservation_cancelled",
        actor: reservation.guestName,
        message: `demande refusée · ${reasonLabel.toLowerCase()}`,
        needsAttention: true,
      });
      return `Demande de ${reservation.guestName} refusée`;
    }),

  reportNoShow: (id) =>
    mutate(set, get, (draft) => {
      const reservation = findReservation(draft, id);
      if (!reservation || reservation.state === "no_show") return null;

      reservation.state = "no_show";
      const table = draft.tables.find((t) => t.reservationId === id);
      if (table && table.state === "reserved") {
        table.state = "free";
        delete table.reservationId;
      }
      draft.upcomingReservations = draft.upcomingReservations.filter(
        (r) => r.id !== id,
      );
      draft.currentService.noShowCovers += reservation.partySize;
      draft.noShows.count += 1;
      draft.noShows.lostRevenueMad +=
        reservation.partySize * draft.averageTicket.amountMad;

      pushActivity(draft, {
        type: "no_show",
        actor: reservation.guestName,
        message: `noté absent · ${reservation.partySize} couverts`,
        needsAttention: true,
      });
      return `${reservation.guestName} noté absent`;
    }),

  clearTable: (id) =>
    mutate(set, get, (draft) => {
      const table = draft.tables.find((t) => t.id === id);
      if (!table || table.state === "free") return null;

      table.state = "free";
      delete table.reservationId;
      delete table.seatedAt;
      delete table.billMad;

      pushActivity(draft, {
        type: "table_freed",
        actor: "Salle",
        message: `a débarrassé la table ${table.code}`,
        tableCode: table.code,
      });
      return `Table ${table.code} libérée`;
    }),

  seatNextWaiting: () => {
    const data = get().data;
    if (!data) return null;
    const next = data.waitlist[0];
    if (!next) return null;
    const table = data.tables.find(
      (t) => t.state === "free" && t.seats >= next.partySize,
    );
    if (!table) return null;
    get().seatReservation(next.id);
    return { seated: next.guestName, table: table.code };
  },
}));

/**
 * Applies a mutation to a structural clone, snapshots the previous state
 * for undo, and drops the write entirely when the mutation reports it
 * had nothing to do (returns null) — so a no-op never burns an undo slot.
 */
function mutate(
  set: (fn: (s: RestaurantState) => Partial<RestaurantState>) => void,
  get: () => RestaurantState,
  fn: (draft: RestaurantOverview) => string | null,
) {
  const current = get().data;
  if (!current) return;

  const draft = structuredClone(current) as RestaurantOverview;
  const applied = fn(draft);
  if (applied === null) return;

  set((s) => ({
    data: draft,
    past: [...s.past, current].slice(-UNDO_DEPTH),
  }));
}

function findReservation(data: RestaurantOverview, id: string) {
  return (
    data.upcomingReservations.find((r) => r.id === id) ??
    data.waitlist.find((r) => r.id === id)
  );
}

function pushActivity(
  data: RestaurantOverview,
  entry: Omit<RestaurantActivityItem, "id" | "at">,
) {
  data.activity = [
    { ...entry, id: `act_local_${Date.now()}`, at: new Date().toISOString() },
    ...data.activity,
  ].slice(0, 12);
}

/**
 * Seeds the store from the server payload once per payload identity.
 * Re-running on every render would discard local mutations on each
 * re-render; keying on the payload lets a genuine server refresh through.
 */
export function useHydrateRestaurant(data: RestaurantOverview) {
  const hydrate = useRestaurantStore((s) => s.hydrate);
  const seeded = useRef<RestaurantOverview | null>(null);

  if (seeded.current !== data && useRestaurantStore.getState().data === null) {
    // First paint, including SSR — hydrate synchronously so the very
    // first render already has data and nothing flashes.
    seeded.current = data;
    useRestaurantStore.setState({ data, past: [] });
  }

  useEffect(() => {
    if (seeded.current !== data) {
      seeded.current = data;
      hydrate(data);
    }
  }, [data, hydrate]);

  return useRestaurantStore((s) => s.data) ?? data;
}
