// The verbs the venue's screens can dispatch.
//
// Listed here rather than inferred, and imported by both halves: the
// client uses it to decide what to send to the server action, the server
// action switches on it. A verb missing from one side is a button that
// silently does nothing, which is the failure this list exists to make
// impossible.
//
// Not a "use server" module on purpose — a server action file may only
// export async functions, and this is a constant.

export const SERVER_COMMANDS = [
  // Service floor
  "waitlist.add",
  "waitlist.notify",
  "waitlist.seat",
  "waitlist.remove",
  "waitlist.requote",
  "waitlist.convert",
  "waitlist.settings.online",
  "waitlist.settings.maxParty",
  "waitlist.settings.defaultQuote",
  "waitlist.settings.pausedReason",
  "briefing.addNote",
  "calendar.close",
  "calendar.open",
  "calendar.capacity",
  // Guest vocabulary
  "tag.create",
  "tag.edit",
  "tag.archive",
  "tag.apply",
  "rule.toggle",
  "rule.threshold",
  "rule.window",
  "segment.create",
  "segment.delete",
  // Growth
  "offer.create",
  "offer.edit",
  "offer.status",
  "offer.duplicate",
  "experience.create",
  "experience.edit",
  "experience.status",
  // Vie nocturne
  "guestList.status",
  "guestList.addEntry",
  "guestList.checkIn",
  "guestList.undoCheckIn",
  "tableType.create",
  "tableType.edit",
  "tableOffer.edit",
  "table.confirm",
  "table.requestDeposit",
  "table.markReached",
  "table.release",
  "promoter.create",
  "promoter.edit",
  "promoter.setActive",
  // Paiements
  "depositPolicy.create",
  "depositPolicy.toggle",
  "depositPolicy.amount",
  "depositPolicy.noShowFee",
  "depositPolicy.grace",
  "deposit.chase",
  "deposit.capture",
  "deposit.release",
  "deposit.refund",
  "cancellationPolicy.freeUntil",
  "cancellationPolicy.lateFee",
  "cancellationPolicy.noShowFee",
  "cancellationPolicy.message",
  "cancellation.waive",
  "cancellation.dispute",
  "transaction.link",
  // Marketing
  "campaign.create",
  "campaign.edit",
  "campaign.status",
  "campaign.duplicate",
  "campaign.test",
  "suppression.add",
  // Disponibilités
  "service.create",
  "service.edit",
  "service.remove",
  "pacing.set",
  // Avis
  "survey.set",
  // Ma fiche
  "zone.setAvailable",
  // Paramètres
  "settings.set",
  // Support
  "support.contact",
] as const;

export type ServerCommand = (typeof SERVER_COMMANDS)[number];

const SET = new Set<string>(SERVER_COMMANDS);

export function isServerCommand(name: string): name is ServerCommand {
  return SET.has(name);
}
