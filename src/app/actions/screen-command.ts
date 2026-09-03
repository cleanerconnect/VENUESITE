"use server";

// One server action for every command a spec-declared form submits.
//
// The client sends a command *name* and a bag of values. Nothing else:
// no table, no column, no venue id. The name is resolved here against a
// closed list, the venue comes from the session, and the values are
// validated again whatever the form did.
//
// That is what keeps the write surface as narrow as the read surface.
// A spec that arrived over the wire could ask for any command in this
// file and nothing outside it.

import { revalidatePath } from "next/cache";
import { requireVenueAccess, resolveSession } from "@/lib/auth/server-session";
import { getRestaurantRepository } from "@/lib/data";
import { StaleWriteError } from "@/lib/data/repository";
import { COPY } from "@/lib/copy/fr";

export interface CommandResult {
  ok: boolean;
  message?: string;
}

type Values = Record<string, string | number | boolean>;

const str = (v: Values, key: string, fallback = "") =>
  typeof v[key] === "string" ? (v[key] as string) : fallback;
const num = (v: Values, key: string, fallback = 0) =>
  typeof v[key] === "number"
    ? (v[key] as number)
    : typeof v[key] === "string" && v[key] !== ""
      ? Number(v[key])
      : fallback;
const bool = (v: Values, key: string, fallback = false) =>
  typeof v[key] === "boolean" ? (v[key] as boolean) : fallback;
/** "1,2,5" or a repeated field, to ISO weekdays. */
const weekdays = (v: Values, key: string) =>
  str(v, key, "1,2,3,4,5,6,7")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n >= 1 && n <= 7);

export async function runScreenCommand(
  command: string,
  values: Values,
): Promise<CommandResult> {
  const session = await resolveSession();
  if (!session) return { ok: false, message: COPY.error.sessionExpired };

  try {
    await requireVenueAccess(session.venueId);
  } catch {
    return { ok: false, message: COPY.error.sessionExpired };
  }

  const repo = getRestaurantRepository();
  const venueId = session.venueId;
  const staff = session.role === "staff";

  /** Verbs the door runs. Everything else is manager or owner work. */
  const doorVerbs = new Set([
    "waitlist.add",
    "waitlist.notify",
    "waitlist.seat",
    "waitlist.remove",
    "waitlist.requote",
    "waitlist.convert",
    "guestList.addEntry",
    "guestList.checkIn",
    "guestList.undoCheckIn",
    "briefing.addNote",
  ]);
  if (staff && !doorVerbs.has(command)) {
    return { ok: false, message: "Votre rôle ne permet pas cette action." };
  }

  try {
    switch (command) {
      // ── Service floor ──
      case "waitlist.add":
        await repo.runServiceFloorAction(venueId, {
          kind: "waitlist.add",
          guestName: str(values, "guestName"),
          guestPhone: str(values, "guestPhone"),
          partySize: num(values, "partySize", 2),
          quotedMinutes: num(values, "quotedMinutes", 20),
          source: "walk_in",
        });
        return done("Groupe ajouté à la liste.");

      case "waitlist.notify":
        await repo.runServiceFloorAction(venueId, {
          kind: "waitlist.notify",
          id: str(values, "id"),
        });
        return done("Message envoyé : la table est annoncée prête.");

      case "waitlist.seat":
        await repo.runServiceFloorAction(venueId, {
          kind: "waitlist.seat",
          id: str(values, "id"),
        });
        return done("Groupe installé. La visite est enregistrée au fichier client.");

      case "waitlist.remove":
        await repo.runServiceFloorAction(venueId, {
          kind: "waitlist.remove",
          id: str(values, "id"),
          reason: (str(values, "reason", "parti") as "parti" | "no_show" | "doublon"),
        });
        return done("Groupe retiré de la liste.");

      case "waitlist.requote":
        await repo.runServiceFloorAction(venueId, {
          kind: "waitlist.requote",
          id: str(values, "id"),
          quotedMinutes: num(values, "quotedMinutes", 20),
        });
        return done("Délai mis à jour.");

      case "waitlist.convert":
        await repo.runServiceFloorAction(venueId, {
          kind: "waitlist.convert",
          id: str(values, "id"),
          at: `${str(values, "date")}T${str(values, "time", "20:00")}:00`,
        });
        return done("Réservation créée.");

      case "waitlist.settings.online":
      case "waitlist.settings.maxParty":
      case "waitlist.settings.defaultQuote":
      case "waitlist.settings.pausedReason": {
        const current = await repo.getServiceFloor(venueId);
        const s = current.waitlistSettings;
        await repo.runServiceFloorAction(venueId, {
          kind: "waitlist.settings",
          onlineOpen:
            command === "waitlist.settings.online" ? bool(values, "value") : s.onlineOpen,
          maxPartyOnline:
            command === "waitlist.settings.maxParty"
              ? num(values, "value", s.maxPartyOnline)
              : s.maxPartyOnline,
          defaultQuoteMinutes:
            command === "waitlist.settings.defaultQuote"
              ? num(values, "value", s.defaultQuoteMinutes)
              : s.defaultQuoteMinutes,
          pausedReason:
            command === "waitlist.settings.pausedReason"
              ? str(values, "value")
              : s.pausedReason,
        });
        return done();
      }

      case "briefing.addNote":
        await repo.runServiceFloorAction(venueId, {
          kind: "shiftNote.add",
          body: str(values, "body"),
          pinned: bool(values, "pinned"),
        });
        return done("Note ajoutée au briefing.");

      case "calendar.close":
        await repo.runServiceFloorAction(venueId, {
          kind: "calendar.close",
          date: str(values, "date"),
          reason: str(values, "reason"),
        });
        return done("Journée fermée. L'application ne prend plus de réservation ce jour-là.");

      case "calendar.open":
        await repo.runServiceFloorAction(venueId, {
          kind: "calendar.open",
          date: str(values, "date"),
        });
        return done("Journée rouverte.");

      case "calendar.capacity":
        await repo.runServiceFloorAction(venueId, {
          kind: "calendar.capacity",
          date: str(values, "date"),
          capacity: num(values, "capacity"),
          note: str(values, "note"),
        });
        return done("Capacité exceptionnelle enregistrée.");

      // ── Guest vocabulary ──
      case "tag.create":
        await repo.runGuestGraphAction(venueId, {
          kind: "tag.create",
          label: str(values, "label"),
          colour: str(values, "colour", "violet"),
          staffVisible: bool(values, "staffVisible", true),
        });
        return done("Étiquette créée.");

      case "tag.edit":
        await repo.runGuestGraphAction(venueId, {
          kind: "tag.update",
          id: str(values, "id"),
          label: str(values, "label"),
          colour: str(values, "colour", "violet"),
          staffVisible: bool(values, "staffVisible", true),
        });
        return done("Étiquette modifiée.");

      case "tag.archive":
        await repo.runGuestGraphAction(venueId, {
          kind: "tag.archive",
          id: str(values, "id"),
        });
        return done("Étiquette archivée.");

      case "tag.apply":
        await repo.runGuestGraphAction(venueId, {
          kind: "tag.apply",
          tagId: str(values, "tagId"),
          customerIds: str(values, "customerIds").split(",").filter(Boolean),
        });
        return done("Étiquette appliquée.");

      case "rule.toggle":
      case "rule.threshold":
      case "rule.window": {
        const graph = await repo.getGuestGraph(venueId);
        const rule = graph.rules.find((r) => r.id === str(values, "id"));
        if (!rule) return { ok: false, message: COPY.error.stale };
        await repo.runGuestGraphAction(venueId, {
          kind: "rule.update",
          id: rule.id,
          threshold:
            command === "rule.threshold" ? num(values, "value", rule.threshold) : rule.threshold,
          windowDays:
            command === "rule.window" ? num(values, "value", rule.windowDays) : rule.windowDays,
          enabled: command === "rule.toggle" ? bool(values, "value") : rule.enabled,
        });
        return done();
      }

      case "segment.create":
        await repo.runGuestGraphAction(venueId, {
          kind: "segment.create",
          name: str(values, "name"),
          description: str(values, "description"),
          criteria: { tags: str(values, "tags").split(",").filter(Boolean) },
          memberCount: 0,
        });
        return done("Segment créé.");

      case "segment.delete":
        await repo.runGuestGraphAction(venueId, {
          kind: "segment.delete",
          id: str(values, "id"),
        });
        return done("Segment supprimé.");

      // ── Growth ──
      case "offer.create":
      case "offer.edit":
        await repo.runGrowthAction(venueId, {
          kind: "offer.save",
          offer: {
            id: str(values, "id") || null,
            name: str(values, "name"),
            kind: str(values, "offerKind", "percent") as
              | "percent"
              | "amount"
              | "free_item"
              | "set_menu",
            value: num(values, "value"),
            freeItemLabel: str(values, "freeItemLabel"),
            weekdays: weekdays(values, "weekdays"),
            serviceIds: [],
            startsOn: str(values, "startsOn"),
            endsOn: str(values, "endsOn"),
            coverCap: num(values, "coverCap"),
            minParty: num(values, "minParty", 1),
            prepaymentRequired: bool(values, "prepaymentRequired"),
            status: str(values, "status", "draft") as
              | "draft"
              | "scheduled"
              | "active"
              | "paused"
              | "archived",
          },
        });
        return done("Offre enregistrée.");

      case "offer.status":
        await repo.runGrowthAction(venueId, {
          kind: "offer.status",
          id: str(values, "id"),
          status: str(values, "status", "paused") as
            | "draft"
            | "scheduled"
            | "active"
            | "paused"
            | "archived",
        });
        return done("Offre mise à jour.");

      case "offer.duplicate":
        await repo.runGrowthAction(venueId, {
          kind: "offer.duplicate",
          id: str(values, "id"),
        });
        return done("Offre dupliquée en brouillon.");

      case "experience.create":
      case "experience.edit":
        await repo.runGrowthAction(venueId, {
          kind: "experience.save",
          experience: {
            id: str(values, "id") || null,
            title: str(values, "title"),
            description: str(values, "description"),
            startsAt: `${str(values, "date")}T${str(values, "time", "19:00")}:00`,
            endsAt: `${str(values, "date")}T${str(values, "endTime", "23:00")}:00`,
            capacity: num(values, "capacity", 20),
            priceMad: num(values, "priceMad"),
            prepayPercent: num(values, "prepayPercent"),
            cancellationTerms: str(values, "cancellationTerms"),
            addons: [],
            status: str(values, "status", "brouillon") as
              | "brouillon"
              | "publie"
              | "complet"
              | "termine",
          },
        });
        return done("Expérience enregistrée.");

      case "experience.status":
        await repo.runGrowthAction(venueId, {
          kind: "experience.status",
          id: str(values, "id"),
          status: str(values, "status", "publie") as
            | "brouillon"
            | "publie"
            | "complet"
            | "termine",
        });
        return done("Expérience mise à jour.");

      // ── Vie nocturne ──
      case "guestList.status":
        await repo.runNightlifeAction(venueId, {
          kind: "guestList.status",
          id: str(values, "id"),
          status: str(values, "status", "fermee") as "ouverte" | "fermee",
        });
        return done("Liste mise à jour.");

      case "guestList.addEntry":
        await repo.runNightlifeAction(venueId, {
          kind: "guestList.addEntry",
          guestListId: str(values, "guestListId"),
          guestName: str(values, "guestName"),
          guestPhone: str(values, "guestPhone"),
          partySize: num(values, "partySize", 1),
          source: str(values, "source", "sur_place") as
            | "app"
            | "promoteur"
            | "sur_place",
          promoterId: str(values, "promoterId") || null,
        });
        return done("Entrée ajoutée à la liste.");

      case "guestList.checkIn":
        await repo.runNightlifeAction(venueId, {
          kind: "guestList.checkIn",
          entryId: str(values, "entryId"),
          count: num(values, "count", 1),
        });
        return done("Entrée validée. Le client est enregistré au fichier.");

      case "guestList.undoCheckIn":
        await repo.runNightlifeAction(venueId, {
          kind: "guestList.undoCheckIn",
          entryId: str(values, "entryId"),
        });
        return done("Entrée annulée.");

      case "tableType.create":
      case "tableType.edit":
        await repo.runNightlifeAction(venueId, {
          kind: "tableType.save",
          id: str(values, "id") || null,
          name: str(values, "name"),
          count: num(values, "count", 1),
          minGuests: num(values, "minGuests", 2),
          maxGuests: num(values, "maxGuests", 8),
          depositPercent: num(values, "depositPercent"),
          packageLabel: str(values, "packageLabel"),
          cancellationHours: num(values, "cancellationHours", 24),
        });
        return done("Type de table enregistré.");

      case "tableOffer.edit":
        await repo.runNightlifeAction(venueId, {
          kind: "tableOffer.save",
          tableTypeId: str(values, "tableTypeId"),
          nightKind: str(values, "nightKind", "weekend"),
          minimumMad: num(values, "minimumMad"),
        });
        return done("Minimum enregistré.");

      case "table.confirm":
        await repo.runNightlifeAction(venueId, {
          kind: "table.confirm",
          id: str(values, "id"),
        });
        return done("Table confirmée. Le client est prévenu.");

      case "table.requestDeposit":
        await repo.runNightlifeAction(venueId, {
          kind: "table.requestDeposit",
          id: str(values, "id"),
        });
        return done("Acompte demandé.");

      case "table.markReached":
        await repo.runNightlifeAction(venueId, {
          kind: "table.markReached",
          id: str(values, "id"),
          amountMad: num(values, "amountMad"),
        });
        return done("Montant consommé enregistré.");

      case "table.release":
        await repo.runNightlifeAction(venueId, {
          kind: "table.release",
          id: str(values, "id"),
        });
        return done("Table libérée.");

      case "promoter.create":
      case "promoter.edit":
        await repo.runNightlifeAction(venueId, {
          kind: "promoter.save",
          id: str(values, "id") || null,
          fullName: str(values, "fullName"),
          phone: str(values, "phone"),
          commissionPercent: num(values, "commissionPercent"),
        });
        return done("Promoteur enregistré.");

      case "promoter.setActive":
        await repo.runNightlifeAction(venueId, {
          kind: "promoter.setActive",
          id: str(values, "id"),
          active: bool(values, "active"),
        });
        return done("Promoteur mis à jour.");

      // ── Paiements ──
      case "depositPolicy.create":
      case "depositPolicy.toggle":
      case "depositPolicy.amount":
      case "depositPolicy.noShowFee":
      case "depositPolicy.grace": {
        const desk = await repo.getMoneyDesk(venueId);
        const id = str(values, "id") || null;
        const policy = desk.depositPolicies.find((p) => p.id === id);
        await repo.runMoneyAction(venueId, {
          kind: "depositPolicy.save",
          id,
          name: policy?.name ?? str(values, "name", "Nouvelle règle"),
          appliesTo:
            policy?.appliesTo ??
            (str(values, "appliesTo", "party_size") as
              | "party_size"
              | "service"
              | "night"
              | "experience"
              | "table"),
          appliesValue: policy?.appliesValue ?? str(values, "appliesValue"),
          mode:
            policy?.mode ??
            (str(values, "mode", "per_person") as
              | "none"
              | "imprint"
              | "per_person"
              | "full"),
          amountMad:
            command === "depositPolicy.amount"
              ? num(values, "value")
              : (policy?.amountMad ?? num(values, "amountMad")),
          noShowFeeMad:
            command === "depositPolicy.noShowFee"
              ? num(values, "value")
              : (policy?.noShowFeeMad ?? 0),
          lateCancelFeeMad: policy?.lateCancelFeeMad ?? 0,
          graceMinutes:
            command === "depositPolicy.grace"
              ? num(values, "value")
              : (policy?.graceMinutes ?? 15),
          enabled:
            command === "depositPolicy.toggle"
              ? bool(values, "value")
              : (policy?.enabled ?? true),
          expectedVersion: policy?.version ?? null,
        });
        return done("Règle enregistrée.");
      }

      case "deposit.chase":
        await repo.runMoneyAction(venueId, {
          kind: "deposit.chase",
          id: str(values, "id"),
        });
        return done("Relance envoyée.");

      case "deposit.capture":
      case "deposit.release":
      case "deposit.refund":
        await repo.runMoneyAction(venueId, {
          kind: command as "deposit.capture" | "deposit.release" | "deposit.refund",
          id: str(values, "id"),
          // One key per movement per deposit: the processor is idempotent
          // on it, so a double submit is refused rather than charged.
          idempotencyKey: `${venueId}:${str(values, "id")}:${command}`,
        });
        return done("Mouvement enregistré.");

      case "cancellationPolicy.freeUntil":
      case "cancellationPolicy.lateFee":
      case "cancellationPolicy.noShowFee":
      case "cancellationPolicy.message": {
        const desk = await repo.getMoneyDesk(venueId);
        const p = desk.cancellationPolicy;
        await repo.runMoneyAction(venueId, {
          kind: "cancellationPolicy.save",
          freeUntilHours:
            command === "cancellationPolicy.freeUntil"
              ? num(values, "value", p.freeUntilHours)
              : p.freeUntilHours,
          lateFeeMad:
            command === "cancellationPolicy.lateFee"
              ? num(values, "value", p.lateFeeMad)
              : p.lateFeeMad,
          noShowFeeMad:
            command === "cancellationPolicy.noShowFee"
              ? num(values, "value", p.noShowFeeMad)
              : p.noShowFeeMad,
          guestMessage:
            command === "cancellationPolicy.message"
              ? str(values, "value")
              : p.guestMessage,
          expectedVersion: p.version,
        });
        return done();
      }

      case "cancellation.waive":
        await repo.runMoneyAction(venueId, {
          kind: "cancellation.waive",
          id: str(values, "id"),
        });
        return done("Frais annulés.");

      case "cancellation.dispute":
        await repo.runMoneyAction(venueId, {
          kind: "cancellation.dispute",
          id: str(values, "id"),
          disputed: bool(values, "disputed", true),
        });
        return done("Litige mis à jour.");

      case "transaction.link":
        await repo.runMoneyAction(venueId, {
          kind: "transaction.link",
          id: str(values, "id"),
          reservationId: str(values, "reservationId") || null,
        });
        return done("Transaction rattachée.");

      // ── Marketing ──
      case "campaign.create":
      case "campaign.edit":
        await repo.runMarketingAction(venueId, {
          kind: "campaign.save",
          campaign: {
            id: str(values, "id") || null,
            name: str(values, "name"),
            channel: str(values, "channel", "email") as "email" | "sms" | "whatsapp",
            template: str(values, "template", "newsletter") as
              | "offre"
              | "evenement"
              | "newsletter"
              | "anniversaire"
              | "win_back",
            segmentId: str(values, "segmentId") || null,
            subject: str(values, "subject"),
            body: str(values, "body"),
            scheduledFor: str(values, "scheduledFor") || null,
            automation: "",
          },
        });
        return done("Campagne enregistrée.");

      case "campaign.status":
        await repo.runMarketingAction(venueId, {
          kind: "campaign.status",
          id: str(values, "id"),
          status: str(values, "status", "en_pause") as
            | "brouillon"
            | "programmee"
            | "envoi"
            | "envoyee"
            | "en_pause",
        });
        return done("Campagne mise à jour.");

      case "campaign.duplicate":
        await repo.runMarketingAction(venueId, {
          kind: "campaign.duplicate",
          id: str(values, "id"),
        });
        return done("Campagne dupliquée.");

      case "campaign.test":
        await repo.runMarketingAction(venueId, {
          kind: "campaign.test",
          id: str(values, "id"),
          recipient: str(values, "recipient"),
        });
        return done("Test envoyé.");

      case "suppression.add":
        await repo.runMarketingAction(venueId, {
          kind: "suppression.add",
          contact: str(values, "contact"),
          reason: str(values, "reason"),
        });
        return done("Contact ajouté à la liste noire.");

      // ── Disponibilités ──
      case "service.create":
      case "service.edit": {
        const config = await repo.getServiceConfiguration(venueId);
        const existing = config.services.find((s) => s.id === str(values, "id"));
        await repo.runConfigurationAction(venueId, {
          kind: "service.save",
          id: existing?.id ?? null,
          name: str(values, "name"),
          kindLabel: str(values, "kindLabel", "service"),
          weekdays: weekdays(values, "weekdays"),
          startsAt: str(values, "startsAt", "19:00"),
          endsAt: str(values, "endsAt", "23:00"),
          lastBookingAt: str(values, "lastBookingAt", "22:00"),
          capacityCovers: num(values, "capacityCovers", 60),
          coversPerQuarter: num(values, "coversPerQuarter", 10),
          turnMinutesSmall: num(values, "turnMinutesSmall", 90),
          turnMinutesLarge: num(values, "turnMinutesLarge", 120),
          zoneIds: existing?.zoneIds ?? [],
          enabled: bool(values, "enabled", true),
          expectedVersion: existing?.version ?? null,
        });
        return done("Service enregistré.");
      }

      case "service.remove":
        await repo.runConfigurationAction(venueId, {
          kind: "service.remove",
          id: str(values, "id"),
        });
        return done("Service supprimé.");

      case "pacing.set": {
        const config = await repo.getServiceConfiguration(venueId);
        const p = config.pacing;
        const field = str(values, "field");
        await repo.runConfigurationAction(venueId, {
          kind: "pacing.save",
          maxArrivalsPerQuarter:
            field === "maxArrivalsPerQuarter"
              ? num(values, "value", p.maxArrivalsPerQuarter)
              : p.maxArrivalsPerQuarter,
          maxCoversPerService:
            field === "maxCoversPerService"
              ? num(values, "value", p.maxCoversPerService)
              : p.maxCoversPerService,
          maxPartyOnline:
            field === "maxPartyOnline" ? num(values, "value", p.maxPartyOnline) : p.maxPartyOnline,
          minPartyOnline:
            field === "minPartyOnline" ? num(values, "value", p.minPartyOnline) : p.minPartyOnline,
          requestOnlyAbove:
            field === "requestOnlyAbove"
              ? num(values, "value", p.requestOnlyAbove)
              : p.requestOnlyAbove,
          bookingWindowDays:
            field === "bookingWindowDays"
              ? num(values, "value", p.bookingWindowDays)
              : p.bookingWindowDays,
          sameDayCutoff:
            field === "sameDayCutoff" ? str(values, "value", p.sameDayCutoff) : p.sameDayCutoff,
          minLeadMinutes:
            field === "minLeadMinutes" ? num(values, "value", p.minLeadMinutes) : p.minLeadMinutes,
          onlineBookingOpen:
            field === "onlineBookingOpen"
              ? bool(values, "value")
              : p.onlineBookingOpen,
          reopenAt: field === "reopenAt" ? str(values, "value") || null : p.reopenAt,
          expectedVersion: p.version,
        });
        return done();
      }

      // ── Avis ──
      case "survey.set": {
        const current = await repo.getSurveyConfig(venueId);
        const field = str(values, "field");
        await repo.saveSurveyConfig(venueId, {
          ...current,
          enabled: field === "enabled" ? bool(values, "value") : current.enabled,
          sendAfterHours:
            field === "sendAfterHours"
              ? num(values, "value", current.sendAfterHours)
              : current.sendAfterHours,
          redirectFromRating:
            field === "redirectFromRating"
              ? num(values, "value", current.redirectFromRating)
              : current.redirectFromRating,
          googleUrl: field === "googleUrl" ? str(values, "value") : current.googleUrl,
          tripadvisorUrl:
            field === "tripadvisorUrl" ? str(values, "value") : current.tripadvisorUrl,
        });
        return done();
      }

      // ── Paramètres ──
      case "settings.set": {
        const current = await repo.getVenueSettings(venueId);
        const field = str(values, "field");
        if (session.role !== "owner") {
          return { ok: false, message: "Seul un propriétaire peut modifier ces réglages." };
        }
        await repo.saveVenueSettings(venueId, {
          ...current,
          [field]:
            typeof values.value === "boolean"
              ? values.value
              : typeof values.value === "number"
                ? values.value
                : str(values, "value"),
        });
        return done("Réglage enregistré.");
      }

      // ── Support ──
      case "support.contact":
        await repo.openSupportTicket(venueId, {
          category: str(values, "category", "Général"),
          subject: str(values, "subject"),
          body: str(values, "body"),
        });
        return done("Demande envoyée. L'équipe LYFE répond sous un jour ouvré.");

      default:
        // An unknown verb is a data problem, not a crash — and saying so
        // beats a button that silently does nothing.
        return { ok: false, message: `Action inconnue : ${command}` };
    }
  } catch (error) {
    if (error instanceof StaleWriteError) {
      return { ok: false, message: `${error.entity} a changé entre-temps. Rechargez la page.` };
    }
    console.error(`[lyfe] ${command} a échoué`, error);
    return { ok: false, message: COPY.error.body };
  }
}

/** Refreshes every venue screen, then reports success. */
function done(message?: string): CommandResult {
  revalidatePath("/restaurant/[[...section]]", "page");
  revalidatePath("/restaurant", "layout");
  return { ok: true, message };
}
