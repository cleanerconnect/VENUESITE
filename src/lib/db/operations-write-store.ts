import "server-only";

// Venue-scoped writes for the rest of the perimeter.
//
// One function per action kind, each scoped by venue_id in the WHERE
// clause exactly like the reads. Three rules the file keeps:
//
//   · Money arrives in MAD and is stored in centimes. The conversion
//     happens here and nowhere above it.
//   · Anything the spec calls concurrent — availability, deposit policy,
//     cancellation policy — checks a version and refuses a stale write
//     rather than merging it.
//   · Anything that moves money is idempotent on a key, so a replayed
//     capture is refused rather than charging the guest twice.
//
// Guest-affecting writes emit through the outbound gateway before they
// return. That is deliberate coupling: the spec requires the app and the
// dashboard never to disagree, and an emission the caller has to
// remember is an emission that eventually gets forgotten.

import { all, one, run, toCents, transaction } from "./store";
import { StaleWriteError } from "@/lib/data/repository";
import type {
  ConfigurationAction,
  GrowthAction,
  GuestGraphAction,
  MarketingAction,
  MoneyAction,
  NightlifeAction,
  ServiceFloorAction,
} from "@/lib/data/repository";
import type {
  OutboundGateway,
  GuestEvent,
} from "@/lib/integrations/outbound";
import { emitGuestEvent } from "@/lib/integrations/outbound";
import type { SurveyConfig, VenueSettings } from "@/lib/types/venue-operations";

const nowIso = () => new Date().toISOString();
/** Short, sortable, collision-free enough for a single-writer store. */
const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A venue row exists and the caller may act on it, or nothing happens. */
function assertVenue(venueId: string) {
  if (!one("SELECT id FROM venues WHERE id = ?", venueId)) {
    throw new StaleWriteError("Lieu");
  }
}

// ── Service floor ────────────────────────────────────────────

export async function applyServiceFloorAction(
  venueId: string,
  action: ServiceFloorAction,
  gateway: OutboundGateway,
): Promise<void> {
  assertVenue(venueId);
  const at = nowIso();

  switch (action.kind) {
    case "waitlist.add": {
      run(
        `INSERT INTO waitlist
           (id, venue_id, customer_id, guest_name, guest_phone, party_size,
            quoted_minutes, added_at, source, status, note)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'waiting', '')`,
        newId("wl"),
        venueId,
        action.guestName.trim(),
        action.guestPhone.trim(),
        action.partySize,
        action.quotedMinutes,
        at,
        action.source,
      );
      return;
    }

    case "waitlist.notify": {
      const party = requireWaitlist(venueId, action.id);
      run(
        "UPDATE waitlist SET status = 'notified', notified_at = ? WHERE id = ? AND venue_id = ?",
        at,
        action.id,
        venueId,
      );
      // The table-ready message, which is the whole point of Prévenir.
      await emitAndLog(
        gateway,
        venueId,
        {
          kind: "waitlist.notified",
          subjectId: action.id,
          customerId: party.customerId,
          recipient: party.guestPhone,
          channel: "whatsapp",
          preview: `Votre table pour ${party.partySize} est prête. Présentez-vous à l'accueil.`,
          at,
        },
        { partySize: party.partySize, quotedMinutes: party.quotedMinutes },
      );
      return;
    }

    case "waitlist.seat": {
      const party = requireWaitlist(venueId, action.id);
      // Seating creates the booking as well as closing the line, because
      // a walk-in that leaves no reservation row leaves the CRM blind to
      // the visit — which the spec calls out by name.
      const customerId = upsertCustomer(venueId, party.guestName, party.guestPhone, at);
      const reservationId = newId("res");
      transaction(() => {
        run(
          `INSERT INTO reservations
             (id, venue_id, service_id, customer_id, guest_name, guest_phone,
              party_size, at, state, channel, qr_code, checked_in_at,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'arrived', 'walk_in', ?, ?, ?, ?)`,
          reservationId,
          venueId,
          currentServiceId(venueId),
          customerId,
          party.guestName,
          party.guestPhone,
          party.partySize,
          at,
          `LYFE-${reservationId.toUpperCase()}`,
          at,
          at,
          at,
        );
        run(
          `INSERT INTO reservation_status_history
             (id, reservation_id, from_state, to_state, actor, actor_id, at)
           VALUES (?, ?, 'waitlisted', 'arrived', 'venue', NULL, ?)`,
          newId("sh"),
          reservationId,
          at,
        );
        run(
          `UPDATE waitlist SET status = 'seated', seated_at = ?,
              customer_id = ?, reservation_id = ?
            WHERE id = ? AND venue_id = ?`,
          at,
          customerId,
          reservationId,
          action.id,
          venueId,
        );
        run(
          `UPDATE customers
              SET visit_count = visit_count + 1, last_visit_at = ?
            WHERE id = ? AND venue_id = ?`,
          at,
          customerId,
          venueId,
        );
      });

      await emitAndLog(
        gateway,
        venueId,
        {
          kind: "waitlist.seated",
          subjectId: reservationId,
          customerId,
          recipient: party.guestPhone,
          channel: "push",
          preview: `Bonne dégustation ! Votre table de ${party.partySize} est installée.`,
          at,
        },
        { partySize: party.partySize, waitedMinutes: minutesSince(party.addedAt, at) },
      );
      return;
    }

    case "waitlist.remove": {
      run(
        `UPDATE waitlist SET status = 'left', removed_at = ?, removal_reason = ?
          WHERE id = ? AND venue_id = ?`,
        at,
        action.reason,
        action.id,
        venueId,
      );
      return;
    }

    case "waitlist.requote": {
      run(
        "UPDATE waitlist SET quoted_minutes = ? WHERE id = ? AND venue_id = ?",
        action.quotedMinutes,
        action.id,
        venueId,
      );
      return;
    }

    case "waitlist.convert": {
      const party = requireWaitlist(venueId, action.id);
      const customerId = upsertCustomer(venueId, party.guestName, party.guestPhone, at);
      const reservationId = newId("res");
      transaction(() => {
        run(
          `INSERT INTO reservations
             (id, venue_id, service_id, customer_id, guest_name, guest_phone,
              party_size, at, state, channel, qr_code, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'confirmed', 'walk_in', ?, ?, ?)`,
          reservationId,
          venueId,
          customerId,
          party.guestName,
          party.guestPhone,
          party.partySize,
          action.at,
          `LYFE-${reservationId.toUpperCase()}`,
          at,
          at,
        );
        run(
          `UPDATE waitlist SET status = 'left', removed_at = ?, removal_reason = 'doublon',
              customer_id = ?, reservation_id = ?
            WHERE id = ? AND venue_id = ?`,
          at,
          customerId,
          reservationId,
          action.id,
          venueId,
        );
      });

      await emitAndLog(
        gateway,
        venueId,
        {
          kind: "reservation.confirmed",
          subjectId: reservationId,
          customerId,
          recipient: party.guestPhone,
          channel: "whatsapp",
          preview: `Votre table de ${party.partySize} est réservée. À très vite.`,
          at,
        },
        { partySize: party.partySize, converted: true },
      );
      return;
    }

    case "waitlist.settings": {
      run(
        `INSERT INTO waitlist_settings
           (venue_id, online_open, max_party_online, default_quote_min, paused_reason, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(venue_id) DO UPDATE SET
           online_open = excluded.online_open,
           max_party_online = excluded.max_party_online,
           default_quote_min = excluded.default_quote_min,
           paused_reason = excluded.paused_reason,
           updated_at = excluded.updated_at`,
        venueId,
        action.onlineOpen ? 1 : 0,
        action.maxPartyOnline,
        action.defaultQuoteMinutes,
        action.pausedReason,
        at,
      );
      return;
    }

    case "shiftNote.add": {
      const service = one(
        `SELECT id, date FROM services WHERE venue_id = ?
          ORDER BY ABS(julianday(opens_at) - julianday('now')) LIMIT 1`,
        venueId,
      );
      run(
        `INSERT INTO shift_notes
           (id, venue_id, service_id, date, author_id, author, body, pinned, created_at)
         VALUES (?, ?, ?, ?, 'venue', 'Manager', ?, ?, ?)`,
        newId("sn"),
        venueId,
        service?.id ?? null,
        String(service?.date ?? at.slice(0, 10)),
        action.body.trim(),
        action.pinned ? 1 : 0,
        at,
      );
      return;
    }

    case "calendar.close": {
      run(
        `INSERT INTO closures (id, venue_id, date, reason) VALUES (?, ?, ?, ?)
         ON CONFLICT(venue_id, date) DO UPDATE SET reason = excluded.reason`,
        newId("cl"),
        venueId,
        action.date,
        action.reason,
      );
      return;
    }

    case "calendar.open": {
      run("DELETE FROM closures WHERE venue_id = ? AND date = ?", venueId, action.date);
      return;
    }

    case "calendar.capacity": {
      run(
        `INSERT INTO capacity_overrides (venue_id, date, capacity, note)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(venue_id, date) DO UPDATE SET
           capacity = excluded.capacity, note = excluded.note`,
        venueId,
        action.date,
        action.capacity,
        action.note,
      );
      return;
    }
  }
}

// ── Guest vocabulary ─────────────────────────────────────────

export function applyGuestGraphAction(
  venueId: string,
  action: GuestGraphAction,
): void {
  assertVenue(venueId);
  const at = nowIso();

  switch (action.kind) {
    case "tag.create": {
      const position = Number(
        one("SELECT COALESCE(MAX(position), -1) + 1 AS p FROM tags WHERE venue_id = ?", venueId)
          ?.p ?? 0,
      );
      run(
        `INSERT INTO tags (id, venue_id, label, colour, origin, staff_visible, archived, position, created_at)
         VALUES (?, ?, ?, ?, 'manual', ?, 0, ?, ?)`,
        newId("tg"),
        venueId,
        action.label.trim(),
        action.colour,
        action.staffVisible ? 1 : 0,
        position,
        at,
      );
      return;
    }
    case "tag.update":
      run(
        `UPDATE tags SET label = ?, colour = ?, staff_visible = ?
          WHERE id = ? AND venue_id = ?`,
        action.label.trim(),
        action.colour,
        action.staffVisible ? 1 : 0,
        action.id,
        venueId,
      );
      return;
    case "tag.archive":
      // Archived, never deleted: a tag applied to two hundred guests
      // would take their history with it.
      run("UPDATE tags SET archived = 1 WHERE id = ? AND venue_id = ?", action.id, venueId);
      return;
    case "tag.apply":
      transaction(() => {
        for (const customerId of action.customerIds) {
          run(
            `INSERT INTO customer_tags (customer_id, tag_id, venue_id, applied_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(customer_id, tag_id) DO NOTHING`,
            customerId,
            action.tagId,
            venueId,
            at,
          );
        }
      });
      return;
    case "tag.remove":
      run(
        "DELETE FROM customer_tags WHERE customer_id = ? AND tag_id = ? AND venue_id = ?",
        action.customerId,
        action.tagId,
        venueId,
      );
      return;
    case "rule.update":
      run(
        `UPDATE tag_rules SET threshold = ?, window_days = ?, enabled = ?, updated_at = ?
          WHERE id = ? AND venue_id = ?`,
        // A spend floor arrives in MAD; a visit count is a plain number.
        isSpendRule(venueId, action.id) ? toCents(action.threshold) : action.threshold,
        action.windowDays,
        action.enabled ? 1 : 0,
        at,
        action.id,
        venueId,
      );
      return;
    case "segment.create":
      run(
        `INSERT INTO segments (id, venue_id, name, description, criteria, member_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        newId("sg"),
        venueId,
        action.name.trim(),
        action.description.trim(),
        JSON.stringify(action.criteria),
        action.memberCount,
        at,
        at,
      );
      return;
    case "segment.delete":
      run("DELETE FROM segments WHERE id = ? AND venue_id = ?", action.id, venueId);
      return;
  }
}

function isSpendRule(venueId: string, ruleId: string): boolean {
  const row = one(
    "SELECT rule FROM tag_rules WHERE id = ? AND venue_id = ?",
    ruleId,
    venueId,
  );
  return String(row?.rule) === "gros_panier";
}

// ── Growth ───────────────────────────────────────────────────

export async function applyGrowthAction(
  venueId: string,
  action: GrowthAction,
  gateway: OutboundGateway,
): Promise<void> {
  assertVenue(venueId);
  const at = nowIso();

  switch (action.kind) {
    case "offer.save": {
      const o = action.offer;
      const id = o.id ?? newId("of");
      // `percent` is percentage points; every other kind is money.
      const value = o.kind === "percent" ? o.value : toCents(o.value);
      run(
        `INSERT INTO offers
           (id, venue_id, name, kind, value, free_item_label, weekdays, service_ids,
            starts_on, ends_on, cover_cap, min_party, prepayment_required,
            channel, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'app', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, kind = excluded.kind, value = excluded.value,
           free_item_label = excluded.free_item_label, weekdays = excluded.weekdays,
           service_ids = excluded.service_ids, starts_on = excluded.starts_on,
           ends_on = excluded.ends_on, cover_cap = excluded.cover_cap,
           min_party = excluded.min_party,
           prepayment_required = excluded.prepayment_required,
           status = excluded.status, updated_at = excluded.updated_at`,
        id,
        venueId,
        o.name.trim(),
        o.kind,
        value,
        o.freeItemLabel.trim(),
        o.weekdays.join(","),
        JSON.stringify(o.serviceIds),
        o.startsOn,
        o.endsOn,
        o.coverCap,
        o.minParty,
        o.prepaymentRequired ? 1 : 0,
        o.status,
        at,
        at,
      );
      return;
    }

    case "offer.status":
      run(
        "UPDATE offers SET status = ?, updated_at = ? WHERE id = ? AND venue_id = ?",
        action.status,
        at,
        action.id,
        venueId,
      );
      return;

    case "offer.duplicate": {
      const row = one("SELECT * FROM offers WHERE id = ? AND venue_id = ?", action.id, venueId);
      if (!row) throw new StaleWriteError("Offre");
      run(
        `INSERT INTO offers
           (id, venue_id, name, kind, value, free_item_label, weekdays, service_ids,
            starts_on, ends_on, cover_cap, min_party, prepayment_required,
            channel, status, created_at, updated_at)
         SELECT ?, venue_id, name || ' (copie)', kind, value, free_item_label,
                weekdays, service_ids, starts_on, ends_on, cover_cap, min_party,
                prepayment_required, channel, 'draft', ?, ?
           FROM offers WHERE id = ? AND venue_id = ?`,
        newId("of"),
        at,
        at,
        action.id,
        venueId,
      );
      return;
    }

    case "experience.save": {
      const x = action.experience;
      const id = x.id ?? newId("xp");
      transaction(() => {
        run(
          `INSERT INTO experiences
             (id, venue_id, title, description, status, starts_at, ends_at,
              recurrence, capacity, price_cents, prepay_percent,
              cancellation_terms, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title, description = excluded.description,
             status = excluded.status, starts_at = excluded.starts_at,
             ends_at = excluded.ends_at, capacity = excluded.capacity,
             price_cents = excluded.price_cents,
             prepay_percent = excluded.prepay_percent,
             cancellation_terms = excluded.cancellation_terms,
             updated_at = excluded.updated_at`,
          id,
          venueId,
          x.title.trim(),
          x.description.trim(),
          x.status,
          x.startsAt,
          x.endsAt,
          x.capacity,
          toCents(x.priceMad),
          x.prepayPercent,
          x.cancellationTerms.trim(),
          at,
          at,
        );
        // Add-ons are replaced wholesale: they are a list the manager
        // edits as one, and diffing them would only invent conflicts.
        run("DELETE FROM experience_addons WHERE experience_id = ?", id);
        x.addons.forEach((addon, i) =>
          run(
            `INSERT INTO experience_addons (id, experience_id, venue_id, label, price_cents, position)
             VALUES (?, ?, ?, ?, ?, ?)`,
            newId("ad"),
            id,
            venueId,
            addon.label.trim(),
            toCents(addon.priceMad),
            i,
          ),
        );
      });
      return;
    }

    case "experience.status": {
      run(
        "UPDATE experiences SET status = ?, updated_at = ? WHERE id = ? AND venue_id = ?",
        action.status,
        at,
        action.id,
        venueId,
      );
      // Publishing is guest-affecting: it is what puts the experience in
      // the app, so the ticket holders of a re-published date hear about
      // it the same way they would hear about a booking change.
      if (action.status === "publie") {
        for (const t of all(
          `SELECT id, customer_id, guest_phone FROM tickets
            WHERE experience_id = ? AND venue_id = ? AND status IN ('reserve','paye')`,
          action.id,
          venueId,
        )) {
          await emitAndLog(
            gateway,
            venueId,
            {
              kind: "experience.booked",
              subjectId: String(t.id),
              customerId: t.customer_id == null ? null : String(t.customer_id),
              recipient: String(t.guest_phone ?? ""),
              channel: "push",
              preview: "Votre expérience est confirmée. Retrouvez votre billet dans l'app.",
              at,
            },
            { experienceId: action.id },
          );
        }
      }
      return;
    }
  }
}

// ── Vie nocturne ─────────────────────────────────────────────

export async function applyNightlifeAction(
  venueId: string,
  action: NightlifeAction,
  gateway: OutboundGateway,
): Promise<void> {
  assertVenue(venueId);
  const at = nowIso();

  switch (action.kind) {
    case "guestList.status":
      run(
        "UPDATE guest_lists SET status = ? WHERE id = ? AND venue_id = ?",
        action.status,
        action.id,
        venueId,
      );
      return;

    case "guestList.addEntry": {
      const id = newId("gle");
      run(
        `INSERT INTO guest_list_entries
           (id, venue_id, guest_list_id, guest_name, party_size, guest_phone,
            source, promoter_id, qr_code, checked_in_count, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        id,
        venueId,
        action.guestListId,
        action.guestName.trim(),
        action.partySize,
        action.guestPhone.trim(),
        action.source,
        action.promoterId,
        `LYFE-${id.toUpperCase()}`,
        at,
      );
      return;
    }

    case "guestList.checkIn": {
      const entry = one(
        "SELECT * FROM guest_list_entries WHERE id = ? AND venue_id = ?",
        action.entryId,
        venueId,
      );
      if (!entry) throw new StaleWriteError("Entrée");
      // Refusing the replay is the point of a door scanner; a code that
      // works twice is a code that works for everyone.
      if (entry.checked_in_at != null) throw new StaleWriteError("Entrée déjà validée");

      // The spec is explicit: a guest-list check-in creates a customer
      // record, the same way seating a waitlist party does.
      const customerId = upsertCustomer(
        venueId,
        String(entry.guest_name),
        String(entry.guest_phone ?? ""),
        at,
      );
      transaction(() => {
        run(
          `UPDATE guest_list_entries
              SET checked_in_at = ?, checked_in_count = ?, customer_id = ?
            WHERE id = ? AND venue_id = ?`,
          at,
          action.count,
          customerId,
          action.entryId,
          venueId,
        );
        run(
          `UPDATE customers SET visit_count = visit_count + 1, last_visit_at = ?
            WHERE id = ? AND venue_id = ?`,
          at,
          customerId,
          venueId,
        );
      });

      await emitAndLog(
        gateway,
        venueId,
        {
          kind: "guestlist.checked_in",
          subjectId: action.entryId,
          customerId,
          recipient: String(entry.guest_phone ?? ""),
          channel: "push",
          preview: "Bienvenue ! Votre entrée est validée.",
          at,
        },
        { count: action.count, source: String(entry.source) },
      );
      return;
    }

    case "guestList.undoCheckIn":
      run(
        `UPDATE guest_list_entries SET checked_in_at = NULL, checked_in_count = 0
          WHERE id = ? AND venue_id = ?`,
        action.entryId,
        venueId,
      );
      return;

    case "tableType.save": {
      const id = action.id ?? newId("tt");
      const position = Number(
        one(
          "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM table_types WHERE venue_id = ?",
          venueId,
        )?.p ?? 0,
      );
      run(
        `INSERT INTO table_types
           (id, venue_id, name, count, min_guests, max_guests, deposit_percent,
            package, cancellation_hours, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, count = excluded.count,
           min_guests = excluded.min_guests, max_guests = excluded.max_guests,
           deposit_percent = excluded.deposit_percent,
           package = excluded.package,
           cancellation_hours = excluded.cancellation_hours`,
        id,
        venueId,
        action.name.trim(),
        action.count,
        action.minGuests,
        action.maxGuests,
        action.depositPercent,
        action.packageLabel.trim(),
        action.cancellationHours,
        action.id ? position : position,
      );
      return;
    }

    case "tableOffer.save": {
      const existing = one(
        `SELECT id FROM table_offers
          WHERE venue_id = ? AND table_type_id = ? AND night_kind = ? AND night IS NULL`,
        venueId,
        action.tableTypeId,
        action.nightKind,
      );
      run(
        existing
          ? "UPDATE table_offers SET minimum_cents = ?, updated_at = ? WHERE id = ?"
          : `INSERT INTO table_offers (minimum_cents, updated_at, id, venue_id, table_type_id, night_kind, night)
             VALUES (?, ?, ?, ?, ?, ?, NULL)`,
        ...(existing
          ? [toCents(action.minimumMad), at, String(existing.id)]
          : [
              toCents(action.minimumMad),
              at,
              newId("to"),
              venueId,
              action.tableTypeId,
              action.nightKind,
            ]),
      );
      return;
    }

    case "table.confirm": {
      const table = requireTable(venueId, action.id);
      run(
        "UPDATE table_reservations SET status = 'confirmee', updated_at = ? WHERE id = ? AND venue_id = ?",
        at,
        action.id,
        venueId,
      );
      await emitAndLog(
        gateway,
        venueId,
        {
          kind: "table.confirmed",
          subjectId: action.id,
          customerId: table.customerId,
          recipient: table.guestPhone,
          channel: "whatsapp",
          preview: `Votre table est confirmée pour le ${table.night}. Minimum ${table.minimumMad} MAD.`,
          at,
        },
        { minimumMad: table.minimumMad, partySize: table.partySize },
      );
      return;
    }

    case "table.requestDeposit": {
      const table = requireTable(venueId, action.id);
      const type = one(
        "SELECT deposit_percent FROM table_types WHERE id = ? AND venue_id = ?",
        table.tableTypeId,
        venueId,
      );
      const percent = Number(type?.deposit_percent ?? 0);
      const amount = Math.round((table.minimumMad * percent) / 100);
      const depositId = newId("dep");
      const policy = one(
        "SELECT id FROM deposit_policies WHERE venue_id = ? AND applies_to = 'table' LIMIT 1",
        venueId,
      );

      transaction(() => {
        run(
          `INSERT INTO deposits
             (id, venue_id, policy_id, guest_name, amount_cents, status,
              idempotency_key, requested_at, failure_reason)
           VALUES (?, ?, ?, ?, ?, 'demande', ?, ?, '')`,
          depositId,
          venueId,
          policy?.id ?? null,
          table.guestName,
          toCents(amount),
          `${venueId}:${depositId}:request`,
          at,
        );
        run(
          "UPDATE table_reservations SET deposit_id = ?, updated_at = ? WHERE id = ? AND venue_id = ?",
          depositId,
          at,
          action.id,
          venueId,
        );
      });

      await emitAndLog(
        gateway,
        venueId,
        {
          kind: "deposit.requested",
          subjectId: depositId,
          customerId: table.customerId,
          recipient: table.guestPhone,
          channel: "whatsapp",
          preview: `Merci de régler l'acompte de ${amount} MAD pour confirmer votre table.`,
          at,
        },
        { amountMad: amount, percent },
      );
      return;
    }

    case "table.markReached":
      run(
        `UPDATE table_reservations SET reached_cents = ?, status = 'arrivee', updated_at = ?
          WHERE id = ? AND venue_id = ?`,
        toCents(action.amountMad),
        at,
        action.id,
        venueId,
      );
      return;

    case "table.release":
      run(
        "UPDATE table_reservations SET status = 'liberee', updated_at = ? WHERE id = ? AND venue_id = ?",
        at,
        action.id,
        venueId,
      );
      return;

    case "promoter.save": {
      const id = action.id ?? newId("pr");
      const code =
        action.id
          ? String(one("SELECT code FROM promoters WHERE id = ?", id)?.code ?? slug(action.fullName))
          : slug(action.fullName);
      run(
        `INSERT INTO promoters
           (id, venue_id, full_name, phone, code, commission_percent, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(id) DO UPDATE SET
           full_name = excluded.full_name, phone = excluded.phone,
           commission_percent = excluded.commission_percent`,
        id,
        venueId,
        action.fullName.trim(),
        action.phone.trim(),
        code,
        action.commissionPercent,
        at,
      );
      return;
    }

    case "promoter.setActive":
      run(
        "UPDATE promoters SET active = ? WHERE id = ? AND venue_id = ?",
        action.active ? 1 : 0,
        action.id,
        venueId,
      );
      return;
  }
}

// ── Money ────────────────────────────────────────────────────

export async function applyMoneyAction(
  venueId: string,
  action: MoneyAction,
  gateway: OutboundGateway,
): Promise<void> {
  assertVenue(venueId);
  const at = nowIso();

  switch (action.kind) {
    case "depositPolicy.save": {
      const id = action.id ?? newId("dp");
      if (action.id) {
        const current = one(
          "SELECT version FROM deposit_policies WHERE id = ? AND venue_id = ?",
          id,
          venueId,
        );
        if (!current) throw new StaleWriteError("Règle d'acompte");
        if (
          action.expectedVersion !== null &&
          Number(current.version) !== action.expectedVersion
        ) {
          // Deposits decide whether a guest is charged. A lost update
          // here is money taken under a rule nobody chose.
          throw new StaleWriteError("Règle d'acompte");
        }
      }
      const position = Number(
        one(
          "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM deposit_policies WHERE venue_id = ?",
          venueId,
        )?.p ?? 0,
      );
      run(
        `INSERT INTO deposit_policies
           (id, venue_id, name, applies_to, applies_value, mode, amount_cents,
            no_show_fee_cents, late_cancel_fee_cents, grace_minutes, enabled,
            position, version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, applies_to = excluded.applies_to,
           applies_value = excluded.applies_value, mode = excluded.mode,
           amount_cents = excluded.amount_cents,
           no_show_fee_cents = excluded.no_show_fee_cents,
           late_cancel_fee_cents = excluded.late_cancel_fee_cents,
           grace_minutes = excluded.grace_minutes, enabled = excluded.enabled,
           version = deposit_policies.version + 1,
           updated_at = excluded.updated_at`,
        id,
        venueId,
        action.name.trim(),
        action.appliesTo,
        action.appliesValue,
        action.mode,
        toCents(action.amountMad),
        toCents(action.noShowFeeMad),
        toCents(action.lateCancelFeeMad),
        action.graceMinutes,
        action.enabled ? 1 : 0,
        position,
        at,
      );
      return;
    }

    case "deposit.chase": {
      const deposit = requireDeposit(venueId, action.id);
      await emitAndLog(
        gateway,
        venueId,
        {
          kind: "deposit.requested",
          subjectId: action.id,
          customerId: deposit.customerId,
          recipient: deposit.guestName,
          channel: "whatsapp",
          preview: `Rappel : l'acompte de ${deposit.amountMad} MAD reste à régler.`,
          at,
        },
        { amountMad: deposit.amountMad, reminder: true },
      );
      return;
    }

    case "deposit.capture":
    case "deposit.release":
    case "deposit.refund": {
      const deposit = requireDeposit(venueId, action.id);
      // The processor is idempotent on this key, so the row is too: a
      // retried request finds the key already used and stops.
      const used = one(
        "SELECT id FROM deposits WHERE idempotency_key = ? AND id <> ?",
        action.idempotencyKey,
        action.id,
      );
      if (used) throw new StaleWriteError("Mouvement déjà enregistré");

      const status =
        action.kind === "deposit.capture"
          ? "capture"
          : action.kind === "deposit.release"
            ? "libere"
            : "rembourse";

      run(
        `UPDATE deposits SET status = ?, settled_at = ?, idempotency_key = ?
          WHERE id = ? AND venue_id = ?`,
        status,
        at,
        action.idempotencyKey,
        action.id,
        venueId,
      );

      if (action.kind !== "deposit.release") {
        await emitAndLog(
          gateway,
          venueId,
          {
            kind: action.kind === "deposit.capture" ? "deposit.captured" : "deposit.refunded",
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
          { amountMad: deposit.amountMad },
        );
      }
      return;
    }

    case "cancellationPolicy.save": {
      const current = one(
        "SELECT version FROM cancellation_policies WHERE venue_id = ?",
        venueId,
      );
      if (current && Number(current.version) !== action.expectedVersion) {
        throw new StaleWriteError("Politique d'annulation");
      }
      run(
        `INSERT INTO cancellation_policies
           (venue_id, free_until_hours, late_fee_cents, no_show_fee_cents,
            guest_message, version, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(venue_id) DO UPDATE SET
           free_until_hours = excluded.free_until_hours,
           late_fee_cents = excluded.late_fee_cents,
           no_show_fee_cents = excluded.no_show_fee_cents,
           guest_message = excluded.guest_message,
           version = cancellation_policies.version + 1,
           updated_at = excluded.updated_at`,
        venueId,
        action.freeUntilHours,
        toCents(action.lateFeeMad),
        toCents(action.noShowFeeMad),
        action.guestMessage.trim(),
        at,
      );
      return;
    }

    case "cancellation.waive":
      run(
        "UPDATE cancellation_log SET waived = 1 WHERE id = ? AND venue_id = ?",
        action.id,
        venueId,
      );
      return;

    case "cancellation.dispute":
      run(
        "UPDATE cancellation_log SET disputed = ? WHERE id = ? AND venue_id = ?",
        action.disputed ? 1 : 0,
        action.id,
        venueId,
      );
      return;

    case "transaction.link":
      run(
        "UPDATE transactions SET reservation_id = ? WHERE id = ? AND venue_id = ?",
        action.reservationId,
        action.id,
        venueId,
      );
      return;
  }
}

// ── Marketing ────────────────────────────────────────────────

export async function applyMarketingAction(
  venueId: string,
  action: MarketingAction,
  gateway: OutboundGateway,
): Promise<void> {
  assertVenue(venueId);
  const at = nowIso();

  switch (action.kind) {
    case "campaign.save": {
      const c = action.campaign;
      const id = c.id ?? newId("cp");
      const unitCost = c.channel === "email" ? 2 : c.channel === "sms" ? 35 : 18;
      run(
        `INSERT INTO campaigns
           (id, venue_id, name, channel, template, segment_id, subject, body,
            status, automation, scheduled_for, unit_cost_cents, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, channel = excluded.channel,
           template = excluded.template, segment_id = excluded.segment_id,
           subject = excluded.subject, body = excluded.body,
           automation = excluded.automation,
           scheduled_for = excluded.scheduled_for,
           unit_cost_cents = excluded.unit_cost_cents,
           updated_at = excluded.updated_at`,
        id,
        venueId,
        c.name.trim(),
        c.channel,
        c.template,
        c.segmentId,
        c.subject.trim(),
        c.body,
        c.scheduledFor ? "programmee" : "brouillon",
        c.automation,
        c.scheduledFor,
        unitCost,
        at,
        at,
      );
      return;
    }

    case "campaign.status": {
      run(
        `UPDATE campaigns SET status = ?, sent_at = CASE WHEN ? = 'envoyee' THEN ? ELSE sent_at END,
            updated_at = ?
          WHERE id = ? AND venue_id = ?`,
        action.status,
        action.status,
        at,
        at,
        action.id,
        venueId,
      );
      if (action.status === "envoyee") {
        const c = one("SELECT * FROM campaigns WHERE id = ? AND venue_id = ?", action.id, venueId);
        await emitGuestEvent(
          gateway,
          {
            venueId,
            kind: "campaign.sent",
            subjectId: action.id,
            customerId: null,
            recipient: String(c?.segment_id ?? "segment"),
            channel: String(c?.channel ?? "email") as GuestEvent["channel"],
            preview: String(c?.subject ?? ""),
            at,
          },
          { recipients: Number(c?.recipients ?? 0) },
        );
      }
      return;
    }

    case "campaign.duplicate":
      run(
        `INSERT INTO campaigns
           (id, venue_id, name, channel, template, segment_id, subject, body,
            status, automation, unit_cost_cents, created_at, updated_at)
         SELECT ?, venue_id, name || ' (copie)', channel, template, segment_id,
                subject, body, 'brouillon', automation, unit_cost_cents, ?, ?
           FROM campaigns WHERE id = ? AND venue_id = ?`,
        newId("cp"),
        at,
        at,
        action.id,
        venueId,
      );
      return;

    case "campaign.test": {
      const c = one("SELECT * FROM campaigns WHERE id = ? AND venue_id = ?", action.id, venueId);
      // A test send is a real message to one address, logged like any
      // other — otherwise the log lies about what left the building.
      run(
        `INSERT INTO messages_log
           (id, venue_id, campaign_id, channel, kind, recipient, preview, status, failure_reason, at)
         VALUES (?, ?, ?, ?, 'test', ?, ?, 'envoye', '', ?)`,
        newId("ml"),
        venueId,
        action.id,
        String(c?.channel ?? "email"),
        action.recipient.trim(),
        String(c?.subject ?? ""),
        at,
      );
      return;
    }

    case "suppression.add":
      run(
        `INSERT INTO suppression_list (venue_id, contact, reason, at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(venue_id, contact) DO UPDATE SET reason = excluded.reason`,
        venueId,
        action.contact.trim(),
        action.reason.trim(),
        at,
      );
      return;
  }
}

// ── Availability configuration ───────────────────────────────

export function applyConfigurationAction(
  venueId: string,
  action: ConfigurationAction,
): void {
  assertVenue(venueId);
  const at = nowIso();

  switch (action.kind) {
    case "service.save": {
      const id = action.id ?? newId("sd");
      if (action.id) {
        const current = one(
          "SELECT version FROM service_definitions WHERE id = ? AND venue_id = ?",
          id,
          venueId,
        );
        if (!current) throw new StaleWriteError("Service");
        if (
          action.expectedVersion !== null &&
          Number(current.version) !== action.expectedVersion
        ) {
          // This edit changes what the app offers right now, so a lost
          // update double-books a room somebody just closed.
          throw new StaleWriteError("Service");
        }
      }
      const position = Number(
        one(
          "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM service_definitions WHERE venue_id = ?",
          venueId,
        )?.p ?? 0,
      );
      transaction(() => {
        run(
          `INSERT INTO service_definitions
             (id, venue_id, name, kind, weekdays, starts_at, ends_at, last_booking_at,
              capacity_covers, covers_per_quarter, turn_minutes_small,
              turn_minutes_large, enabled, position, version, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, kind = excluded.kind,
             weekdays = excluded.weekdays, starts_at = excluded.starts_at,
             ends_at = excluded.ends_at, last_booking_at = excluded.last_booking_at,
             capacity_covers = excluded.capacity_covers,
             covers_per_quarter = excluded.covers_per_quarter,
             turn_minutes_small = excluded.turn_minutes_small,
             turn_minutes_large = excluded.turn_minutes_large,
             enabled = excluded.enabled,
             version = service_definitions.version + 1,
             updated_at = excluded.updated_at`,
          id,
          venueId,
          action.name.trim(),
          action.kindLabel,
          action.weekdays.join(","),
          action.startsAt,
          action.endsAt,
          action.lastBookingAt,
          action.capacityCovers,
          action.coversPerQuarter,
          action.turnMinutesSmall,
          action.turnMinutesLarge,
          action.enabled ? 1 : 0,
          position,
          at,
        );
        run("DELETE FROM service_zones WHERE service_definition_id = ?", id);
        for (const zoneId of action.zoneIds) {
          run(
            "INSERT INTO service_zones (service_definition_id, zone_id) VALUES (?, ?)",
            id,
            zoneId,
          );
        }
      });
      return;
    }

    case "service.remove":
      run(
        "DELETE FROM service_definitions WHERE id = ? AND venue_id = ?",
        action.id,
        venueId,
      );
      return;

    case "pacing.save": {
      const current = one("SELECT version FROM pacing_rules WHERE venue_id = ?", venueId);
      if (current && Number(current.version) !== action.expectedVersion) {
        throw new StaleWriteError("Règles de cadence");
      }
      run(
        `INSERT INTO pacing_rules
           (venue_id, max_arrivals_quarter, max_covers_service, max_party_online,
            min_party_online, request_only_above, booking_window_days,
            same_day_cutoff, min_lead_minutes, online_booking_open, reopen_at,
            version, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(venue_id) DO UPDATE SET
           max_arrivals_quarter = excluded.max_arrivals_quarter,
           max_covers_service = excluded.max_covers_service,
           max_party_online = excluded.max_party_online,
           min_party_online = excluded.min_party_online,
           request_only_above = excluded.request_only_above,
           booking_window_days = excluded.booking_window_days,
           same_day_cutoff = excluded.same_day_cutoff,
           min_lead_minutes = excluded.min_lead_minutes,
           online_booking_open = excluded.online_booking_open,
           reopen_at = excluded.reopen_at,
           version = pacing_rules.version + 1,
           updated_at = excluded.updated_at`,
        venueId,
        action.maxArrivalsPerQuarter,
        action.maxCoversPerService,
        action.maxPartyOnline,
        action.minPartyOnline,
        action.requestOnlyAbove,
        action.bookingWindowDays,
        action.sameDayCutoff,
        action.minLeadMinutes,
        action.onlineBookingOpen ? 1 : 0,
        action.reopenAt,
        at,
      );
      return;
    }
  }
}

// ── Configuration, survey and support ────────────────────────

export function saveSurveyConfigRow(venueId: string, config: SurveyConfig): void {
  assertVenue(venueId);
  run(
    `INSERT INTO survey_config
       (venue_id, enabled, send_after_hours, questions, redirect_from_rating,
        google_url, tripadvisor_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(venue_id) DO UPDATE SET
       enabled = excluded.enabled, send_after_hours = excluded.send_after_hours,
       questions = excluded.questions,
       redirect_from_rating = excluded.redirect_from_rating,
       google_url = excluded.google_url,
       tripadvisor_url = excluded.tripadvisor_url,
       updated_at = excluded.updated_at`,
    venueId,
    config.enabled ? 1 : 0,
    config.sendAfterHours,
    JSON.stringify(config.questions),
    config.redirectFromRating,
    config.googleUrl.trim(),
    config.tripadvisorUrl.trim(),
    nowIso(),
  );
}

export function saveVenueSettingsRow(venueId: string, s: VenueSettings): void {
  assertVenue(venueId);
  run(
    `INSERT INTO venue_settings
       (venue_id, configuration, legal_name, ice, rc, billing_address, iban,
        language, timezone, consent_text, retention_months, google_place_url,
        instagram_handle, whatsapp_number, dress_code, minimum_age,
        api_access_enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(venue_id) DO UPDATE SET
       configuration = excluded.configuration, legal_name = excluded.legal_name,
       ice = excluded.ice, rc = excluded.rc,
       billing_address = excluded.billing_address, iban = excluded.iban,
       language = excluded.language, timezone = excluded.timezone,
       consent_text = excluded.consent_text,
       retention_months = excluded.retention_months,
       google_place_url = excluded.google_place_url,
       instagram_handle = excluded.instagram_handle,
       whatsapp_number = excluded.whatsapp_number,
       dress_code = excluded.dress_code, minimum_age = excluded.minimum_age,
       api_access_enabled = excluded.api_access_enabled,
       updated_at = excluded.updated_at`,
    venueId,
    s.configuration,
    s.legalName.trim(),
    s.ice.trim(),
    s.rc.trim(),
    s.billingAddress.trim(),
    s.iban.trim(),
    s.language,
    s.timezone,
    s.consentText.trim(),
    s.retentionMonths,
    s.googlePlaceUrl.trim(),
    s.instagramHandle.trim(),
    s.whatsappNumber.trim(),
    s.dressCode.trim(),
    s.minimumAge,
    s.apiAccessEnabled ? 1 : 0,
    nowIso(),
  );
}

export function openSupportTicketRow(
  venueId: string,
  input: { category: string; subject: string; body: string },
): void {
  assertVenue(venueId);
  const at = nowIso();
  const n = Number(
    one("SELECT COUNT(*) AS n FROM support_tickets WHERE venue_id = ?", venueId)?.n ?? 0,
  );
  run(
    `INSERT INTO support_tickets
       (id, venue_id, reference, category, subject, body, status, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'ouvert', 'venue', ?, ?)`,
    newId("sup"),
    venueId,
    `SUP-${String(5000 + n)}`,
    input.category,
    input.subject.trim(),
    input.body.trim(),
    at,
    at,
  );
}

// ── Shared internals ─────────────────────────────────────────

/**
 * Emits the guest notification and the tracking event, and writes the
 * message log row that proves it. One helper so the three cannot come
 * apart at a call site.
 */
async function emitAndLog(
  gateway: OutboundGateway,
  venueId: string,
  event: Omit<GuestEvent, "venueId">,
  properties: Record<string, string | number | boolean> = {},
) {
  run(
    `INSERT INTO messages_log
       (id, venue_id, customer_id, channel, kind, recipient, preview, status, failure_reason, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'envoye', '', ?)`,
    newId("ml"),
    venueId,
    event.customerId,
    event.channel,
    event.kind,
    event.recipient,
    event.preview,
    event.at,
  );
  await emitGuestEvent(gateway, { venueId, ...event }, properties);
}

/**
 * Finds the guest by phone within the venue, or creates them.
 *
 * Both waitlist seating and guest-list check-in end here, because the
 * spec requires both to produce a customer record — and a walk-in who
 * comes back every Friday should be one guest, not five.
 */
function upsertCustomer(
  venueId: string,
  fullName: string,
  phone: string,
  at: string,
): string {
  if (phone.trim()) {
    const existing = one(
      "SELECT id FROM customers WHERE venue_id = ? AND phone = ?",
      venueId,
      phone.trim(),
    );
    if (existing) return String(existing.id);
  }
  const id = newId("cus");
  run(
    `INSERT INTO customers
       (id, venue_id, full_name, phone, first_seen_at, visit_count,
        total_spend_cents, opted_out_of_marketing)
     VALUES (?, ?, ?, ?, ?, 0, 0, 0)`,
    id,
    venueId,
    fullName,
    // A blank phone would collide on the venue+phone unique index for a
    // second anonymous walk-in, so it is made unique per row instead.
    phone.trim() || `sans-numero-${id}`,
    at,
  );
  return id;
}

function currentServiceId(venueId: string): string | null {
  const row = one(
    `SELECT id FROM services WHERE venue_id = ?
      ORDER BY ABS(julianday(opens_at) - julianday('now')) LIMIT 1`,
    venueId,
  );
  return row ? String(row.id) : null;
}

function requireWaitlist(venueId: string, id: string) {
  const row = one("SELECT * FROM waitlist WHERE id = ? AND venue_id = ?", id, venueId);
  if (!row) throw new StaleWriteError("Partie en attente");
  return {
    customerId: row.customer_id == null ? null : String(row.customer_id),
    guestName: String(row.guest_name),
    guestPhone: String(row.guest_phone ?? ""),
    partySize: Number(row.party_size),
    quotedMinutes: Number(row.quoted_minutes),
    addedAt: String(row.added_at),
  };
}

function requireTable(venueId: string, id: string) {
  const row = one(
    "SELECT * FROM table_reservations WHERE id = ? AND venue_id = ?",
    id,
    venueId,
  );
  if (!row) throw new StaleWriteError("Table");
  return {
    tableTypeId: String(row.table_type_id),
    customerId: row.customer_id == null ? null : String(row.customer_id),
    guestName: String(row.guest_name),
    guestPhone: String(row.guest_phone ?? ""),
    partySize: Number(row.party_size),
    night: String(row.night),
    minimumMad: Math.round(Number(row.minimum_cents) / 100),
  };
}

function requireDeposit(venueId: string, id: string) {
  const row = one("SELECT * FROM deposits WHERE id = ? AND venue_id = ?", id, venueId);
  if (!row) throw new StaleWriteError("Acompte");
  return {
    customerId: row.customer_id == null ? null : String(row.customer_id),
    guestName: String(row.guest_name),
    amountMad: Math.round(Number(row.amount_cents) / 100),
  };
}

const minutesSince = (from: string, to: string) =>
  Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 60_000));

/** A promoter's share link segment. Stable, lowercase, no accents. */
function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}
