# LYFE Venue Dashboard — Target Specification

Restaurant and drinks partner dashboard. Ten navigation groups, thirty screens. One shell, one component library, two configurations (restaurant, drinks). The event organizer dashboard shares the shell and the groups Aujourd'hui, Pilotage, Établissement and Compte.

Conventions used below. Each screen lists its purpose, sections, actions, data it reads and writes, states, and the drinks variant where it differs. "Drawer" means a side sheet opened over the current screen. "Sheet" means a full-height phone surface. Money in MAD. All copy in French.

Out of scope everywhere: kitchen, stock, food cost, POS or till, staff scheduling, floor plan with physical table positions. Zones exist as a booking preference, not as a floor layout.

---

## Entry and shell

**Connexion.** Single login for all partners at lyfemaroc.org via the Org button. Fields: email, password, remember me, forgot password. After authentication the account resolves to its role and to its establishments. States: idle, submitting, invalid credentials, account with no establishment, account with several establishments (opens the switcher), expired session redirect back to the requested route.

**Shell.** Left sidebar with the ten groups and their screens, collapsible on tablet, bottom tab bar on phone showing Aujourd'hui, Réservations, Liste d'attente, Check-in and Plus. Top bar with establishment switcher, global search (guests and reservations), notification bell, quick action button (Nouvelle réservation, Ajouter à la liste d'attente, Scanner), profile menu. Establishment switcher lists every venue the account holds; switching reloads scope server side. Role-based visibility: staff see Aujourd'hui, En service, Clients read-only; managers add Ma présence, Croissance, Vie nocturne, Établissement; owners add Paiements, Pilotage, Compte.

---

## 1. Aujourd'hui

### Accueil
Purpose: answer "what is happening today" in one glance.

Sections: today's headline numbers (reservations, covers, waitlist parties, occupancy of the next service, expected revenue where a source exists); attention queue (pending requests awaiting accept or refuse, unconfirmed reservations past the reconfirmation window, high no-show-risk bookings, unanswered reviews, deposits failed); next service timeline as a horizontal band of the next four hours with arrivals per fifteen minutes; shortcuts to Nouvelle réservation, Liste d'attente, Briefing; a compact seven-day trend of covers versus last week.

Actions: accept or refuse from the queue, open any item in its drawer, jump to Briefing.

Reads: reservations, waitlist, reviews, deposits, analytics_daily. Writes: none directly.

States: empty day (no reservations yet, with a prompt to check availability is open), loading, error, closed day (venue marked closed).

### Réservations
Purpose: the working list of bookings for a chosen day.

Sections: date picker with previous and next day, service tabs (Déjeuner, Dîner, or the services defined in Disponibilités), filter chips (Tous, En attente, Confirmées, Arrivées, No-show, Annulées, Refusées, Liste d'attente), search by name or phone, count per filter. Each row: time, party size, guest name with tags inline (VIP, Habitué, Allergie), zone preference, source (App LYFE, Téléphone, Walk-in, Site), status, deposit state, notes indicator, no-show-risk indicator.

Row actions: Accepter, Refuser (with mandatory coded reason: complet, hors horaires, groupe trop grand, autre), Modifier, Marquer arrivé, No-show, Annuler, Envoyer un message, Ouvrir la fiche client.

Header actions: Nouvelle réservation (drawer: guest lookup or create, date, service, time, covers, zone preference, source, notes, deposit required toggle if policy applies), Ajouter un walk-in (same drawer pre-set to now, source Walk-in, no deposit), Exporter la journée, Imprimer.

Détail réservation drawer: full booking with timeline of status changes and who made them, guest summary card, notes (internal, not visible to guest), special requests from the app, deposit and payment status, communication log (confirmation sent, reminder sent, reconfirmed at), linked loyalty event.

Reads and writes: reservations, reservation_status_history, customers, deposits, notifications_log. Every status change fires the consumer-app notification (EP20-US10) and, for confirm and no-show, the loyalty event (EP30-US3, EP30-US6).

States: empty filter, no service open on that day, loading, error, conflict when a booking changed under the user (show the new state, do not overwrite).

Drinks variant: covers become "personnes"; services become "créneaux"; a row shows table type (Standard, Lounge, VIP) and minimum spend where set; Walk-in becomes "Entrée porte".

### Calendrier
Purpose: see load across days and weeks and act on availability from there.

Sections: week view and month view; each day cell shows covers booked over capacity, a fill bar, and markers for closures, offers, experiences and events; click a day to open that day in Réservations or to open Disponibilités for that day.

Actions: open day, close day, set special capacity for a day, create a closure, jump to Offres for a quiet day.

Reads: reservations aggregated, availability, closures, offers, experiences. Writes: closures and per-day capacity overrides.

---

## 2. En service

### Liste d'attente
Purpose: run the door when the room is full. Both in-house and online parties in one list.

Sections: active list ordered by quoted time, each entry with party name, size, phone, quoted wait, time added, source (Sur place, App), status (En attente, Prévenu, Arrivé, Parti); controls to open or pause the online waitlist for the app, set the maximum party size accepted online, and set a default quote; counters for parties waiting and average current wait.

Actions: Ajouter (name, size, phone, quote), Prévenir (sends the table-ready message by WhatsApp or SMS and starts a countdown), Installer (marks arrived and creates a reservation record at now so the CRM captures the visit), Retirer (with reason: parti, no-show, doublon), Modifier le délai, Convertir en réservation.

Reads and writes: waitlist, customers (creates or enriches), reservations on seating, notifications_log.

States: empty list with online status shown, online paused banner, phone one-handed layout with large Prévenir and Installer buttons.

Drinks variant: same screen with an additional guest-list mode (see Vie nocturne) so the door sees waitlist, guest list and table reservations in three tabs.

### Check-in
Purpose: validate arrivals at the door in under three seconds.

Sections: camera viewfinder for the reservation QR (EP20-US9), manual code entry, name search fallback, result card showing guest, party, time, zone, tags, deposit state, and a single confirm button; recent check-ins list for the last thirty minutes with undo.

Validation rules: refuse a code from another establishment, another date, or a booking already checked in; show the reason. Accept early arrival and late arrival with a warning, not a block.

Actions: Confirmer l'arrivée, Modifier le nombre de personnes à l'arrivée, Ouvrir la fiche client, Annuler le check-in (within five minutes).

Reads and writes: reservations, reservation_status_history, loyalty event on confirmed arrival, customers.visit_count and last_visit.

States: camera denied (manual entry promoted), offline (queue check-ins locally and sync), phone full-screen sheet.

### Briefing
Purpose: the pre-service page the team reads before doors open.

Sections: service selector; headline counts; VIPs and habitués arriving with their preferences; allergies and dietary notes; birthdays and occasions flagged in the app; large parties; first-time guests; guests with a no-show history; open special requests; deposits pending; notes left by managers for the shift.

Actions: Imprimer, Envoyer au groupe WhatsApp de l'équipe, Ajouter une note de service.

Reads: reservations for the service joined to customers and tags. Writes: shift notes.

---

## 3. Clients

### Liste clients
Purpose: the establishment's guest base, built from every reservation, walk-in and waitlist seating.

Sections: search; segment tabs (Tous, VIP, Habitués, Nouveaux, À risque no-show, Inactifs 90 jours, Anniversaire ce mois); filter drawer (tags, visit count range, last visit range, average spend range where available, loyalty tier, zone preference, source of first visit); table with name, phone masked, visits, last visit, tags, loyalty tier, no-show count, spend where available; bulk select.

Actions: Ouvrir la fiche, Ajouter un tag en masse, Exporter la sélection (CSV, respecting the consent flag per customer), Créer une campagne à partir de la sélection (hands the segment to Campagnes), Fusionner des doublons.

Reads: customers, tags, loyalty (read from the loyalty service, never computed here). Writes: tags, merge.

States: empty base (new venue), no result for filter, export in progress.

### Fiche client
Purpose: everything the venue knows about one guest, opened from any list or any reservation.

Sections: header with name, tags, loyalty tier badge, VIP toggle; contact (phone, email, consent status for marketing); visit summary (count, first, last, average party size, favourite service and zone); no-show and late-cancellation history with a risk indicator (none, faible, élevé) derived from the last twelve months; preferences and special requests captured from bookings (allergies, table preference, occasions); spend (average and total, shown only when a source exists: Lyfe Pay transaction or ticket entered at check-in); reviews the guest left and the venue's replies; upcoming reservations; full reservation history; internal notes with author and date; communication log.

Actions: Modifier les notes, Ajouter ou retirer un tag, Marquer VIP, Créer une réservation pour ce client, Envoyer un message, Exporter la fiche, Anonymiser (right to erasure, CNDP).

Reads: customers, reservations, reviews, loyalty service, transactions. Writes: notes, tags, VIP flag, anonymisation request.

### Tags et segments
Purpose: define the vocabulary and the automatic rules.

Sections: manual tags (name, colour, visible to staff) with usage count; automatic tags with editable thresholds: Habitué (at least N visits in M months), Gros panier (average spend above X, only where spend exists), À risque (at least N no-shows in twelve months), Nouveau (first visit within thirty days), Inactif (no visit in ninety days); saved segments combining tags and filters, reusable in Liste clients and Campagnes.

Actions: create, edit, archive tag; edit rule thresholds; create segment.

---

## 4. Ma présence

### Ma fiche
Purpose: everything the app shows about the establishment, editable in one place. Mirror of the app listing, nothing more.

Sections: identity (name, category, sub-category, short description, long description); location (address, map pin, directions note); contact (phone, WhatsApp number, website, Instagram); photos (cover and gallery, drag reorder, minimum three, format and size validation, presigned upload); price band; keywords; facilities (terrasse, parking, accès PMR, wifi, climatisation, salle privée); ambience descriptors; zones offered as booking preference (Salle, Terrasse, Bar, Lounge, VIP) with an optional short description each; opening hours summary pulled from Disponibilités (read-only here, link to edit); dress code and age policy for drinks; preview panel rendering the listing as the app shows it.

Actions: save per section with optimistic update and rollback; Prévisualiser dans l'app; request category change (needs LYFE validation).

Reads and writes: venues, venue_assets, venue_zones.

### Menu
Purpose: the customer-facing menu as displayed in the app. Not a costing or kitchen tool.

Sections: sections and items with name, description, price, tags (végétarien, sans gluten, signature), photo, visibility toggle, availability window (for example brunch on weekends only); PDF menu upload as an alternative or complement; drinks list with the same structure for the drinks configuration; preview as the app renders it.

Actions: add, edit, reorder, hide, archive; import from PDF into structured items (assisted, manager validates); mark an item as sold out for today.

Reads and writes: menu_sections, menu_items, venue_assets.

### Avis
Purpose: read what guests said in the app, answer publicly, and grow the venue's external reputation.

Sections: list of ratings with score, comment, guest (linked to Fiche client), reservation reference, date, reply status; summary (average, distribution, trend versus last period); post-visit survey configuration (on or off, questions, sent through EP20-US11); external redirection setting (invite satisfied guests, four stars and above, to post on Google or Tripadvisor, with the venue's links); flagged reviews queue.

Actions: Répondre (public reply, published after moderation flag when active), Signaler, Marquer comme traité, Modifier les liens externes, Activer le sondage.

Reads and writes: reviews, review_replies, survey_config.

---

## 5. Croissance

### Visibilité
Purpose: understand and influence how the establishment appears in the app.

Sections: listing metrics (impressions in feed and search, listing opens, saves to lists, shares, conversion from open to reservation) over a selectable period; ranking factors shown honestly (completeness of Ma fiche, photo count, response rate to reviews, no-show rate); boost campaigns (period, placement, budget, status, results); completeness checklist with direct links to fix each item.

Actions: Créer un boost, Mettre en pause, Prolonger, Compléter la fiche.

Reads: tracking events (EP10, EP22), boost_campaigns. Writes: boost_campaigns.

### Offres
Purpose: fill quiet services with a discount or perk, TheFork style, without touching the base price list.

Sections: active and past offers, each with type (percentage off the bill, fixed amount, free item, set price menu), applicable days and services, validity window, cap on covers, channel (app only), conditions (minimum party, prepayment required), performance (reservations attributed, covers, estimated uplift versus the same service without offer).

Actions: Créer une offre (wizard), Dupliquer, Planifier, Mettre en pause, Archiver. Suggested quiet slots surfaced from Performance.

Reads: analytics_daily. Writes: offers. The app shows the offer on the listing and applies it at booking; the reservation row carries the offer reference.

### Expériences
Purpose: sell something beyond a table: a tasting night, a set menu, a brunch, a chef's table, an add-on. Bridges to the LYFE events and ticketing engine.

Sections: list of experiences with status (brouillon, publié, complet, terminé); each with title, description, photos, date or recurrence, capacity, price per person, deposit or full prepayment, add-ons (wine pairing, cake, welcome drink) with prices, cancellation terms, guest list per occurrence with check-in; revenue summary per experience.

Actions: Créer une expérience (wizard, reuses the event creation flow), Publier, Gérer les participants, Scanner (opens Check-in in experience mode), Exporter les ventes.

Reads and writes: experiences, tickets, payments through Payzone with the standard 7 percent gross, 4 percent net model.

---

## 6. Vie nocturne (drinks configuration only)

### Guest list
Purpose: manage free or reduced entry lists per night, separate from table reservations.

Sections: nights list; per night: capacity of the list, cut-off time, entry conditions by time band (gratuit avant 23h, 100 MAD après, gratuit pour les femmes avant minuit), status open or closed; entries with name, party size, source (App, Promoteur, Sur place), promoter attribution, checked-in flag; door view optimised for phone with search and one-tap check-in.

Actions: Ouvrir la liste dans l'app, Fermer, Ajouter une entrée, Importer une liste (CSV from a promoter), Check-in, Exporter la nuit.

Reads and writes: guest_lists, guest_list_entries, customers (creates on check-in), promoters.

### Tables minimums
Purpose: sell lounge, booth and VIP tables with a minimum spend, deposit and package, per night or per time band.

Sections: table types with count, capacity range, minimum spend per night template (weekday, weekend, événement spécial), deposit rule (percentage of minimum), included package (bottles, mixers, service), cancellation window; night calendar with sold, held and available tables; requests from the app awaiting confirmation with the guest's profile and history; confirmed tables with deposit status.

Actions: Configurer les types de table, Définir les minimums d'une nuit, Confirmer une demande, Demander l'acompte, Marquer le minimum atteint (manual or from Lyfe Pay), Libérer.

Reads and writes: table_types, table_offers, table_reservations, deposits, transactions.

### Promoteurs
Purpose: attribute entries and tables to promoters and see who brings whom.

Sections: promoter directory (name, phone, active, commission rule if any); per promoter: entries brought, tables brought, check-in rate, no-show rate, revenue attributed where a source exists; shareable link or code per promoter that pre-attributes app bookings.

Actions: Ajouter un promoteur, Générer un lien, Désactiver, Exporter le mois.

Reads and writes: promoters, attribution on guest_list_entries and table_reservations.

---

## 7. Paiements

### Acomptes
Purpose: define when a booking requires money up front, and see the state of every deposit.

Sections: policy rules (none, card imprint, deposit per person, full prepayment) by condition (party size at or above N, specific services, specific nights, experiences, tables minimums); no-show and late-cancellation charge amounts; grace period; ledger of deposits with status (demandé, payé, libéré, capturé, remboursé, échoué), booking reference, guest, amount, dates.

Actions: Modifier la politique, Relancer un acompte non payé, Capturer (no-show), Libérer, Rembourser.

Reads and writes: deposit_policies, deposits, Payzone transactions. Open decision: whether a restaurant deposit is collected directly into the establishment's Payzone account with LYFE's fee deducted at source, or collected by LYFE and paid out to the establishment. The choice determines the payout section of Lyfe Pay and the refund path here.

### Annulations
Purpose: cancellation terms shown to the guest at booking, and the log of what happened.

Sections: policy editor (free until X hours before, then fee Y, no-show fee Z); message shown in the app at booking, previewed; log of cancellations and no-shows with reason, who triggered it (guest or venue), fee applied, dispute flag.

Actions: Modifier la politique, Annuler des frais (goodwill), Marquer un litige.

### Lyfe Pay
Purpose: transactions that passed through Lyfe Pay at this establishment, and the only legitimate source for "spend" elsewhere in the dashboard.

Sections: transactions list (date, guest if linked, amount, method: wallet, carte, TPE), daily totals, payouts to the establishment's bank with status, fees, export.

Actions: Lier une transaction à une réservation, Exporter, Voir le relevé de reversement.

Reads: transactions, payouts. Writes: linkage only.

---

## 8. Pilotage

### Performance
Purpose: the numbers that matter, with a period and a comparison.

Sections: period selector (jour, semaine, mois, trimestre, personnalisé) and comparison (période précédente, même période l'an dernier); KPI tiles: reservations, covers, occupancy against declared capacity, no-show rate, cancellation rate, average party size, lead time between booking and visit, new versus returning guests, review score, reply rate, and revenue and average ticket only where a source exists; charts: covers by day and by service, bookings by source, bookings by hour, no-show by weekday, occupancy heatmap by day and service, guest retention cohort; quiet-slot finder that lists the weakest services and links to Offres.

Actions: change period, export chart data, save a view.

Reads: analytics_daily, reservations, reviews, transactions.

### Bilans
Purpose: periodic reports the owner can read in two minutes or send to a partner.

Sections: monthly and weekly report cards, each with summary numbers, best and worst services, guest highlights, review summary, offers and experiences results, recommendations (three lines maximum, generated from the data); schedule (send by email every Monday and the first of the month); archive.

Actions: Générer maintenant, Télécharger PDF, Planifier l'envoi, Partager un lien.

### Campagnes
Purpose: the marketing surface that the revenue model sells from June 2027. Email, SMS and WhatsApp to the establishment's own guests, within consent.

Sections: campaign list with status and results; create flow: audience (segment from Tags et segments or ad hoc filter), channel, template (offer, event, newsletter, anniversary, win-back), content with merge fields, schedule; automations: welcome after first visit, thank you after visit with review invite, win-back at ninety days, birthday, reconfirmation reminders are not here (they live in Notifications); results: sent, delivered, opened, clicked, reservations attributed, unsubscribes; consent dashboard and suppression list.

Actions: Créer, Dupliquer, Tester, Programmer, Mettre en pause, Exporter les résultats.

Reads: customers with consent, segments. Writes: campaigns, messages_log. Channel costs surfaced before sending.

---

## 9. Établissement

### Disponibilités
Purpose: everything that decides what the app shows as bookable.

Sections: services (name, days, start and end, last booking time, default duration by party size, capacity in covers per fifteen minutes and per service); pacing rules (maximum new arrivals per fifteen minutes, maximum covers per service, maximum party size online, minimum party size online, larger parties routed to request-only); booking window (how far ahead the book opens, same-day cut-off, minimum lead time); zones bookable per service; exceptional days (closures, holidays, private events, reduced capacity, special hours); online booking master switch with a scheduled reopen; preview of what a guest sees for a chosen date.

Actions: edit per row with version check (a stale write is refused, not merged); duplicate a week; bulk close a range; open request-only mode for a night.

Reads and writes: services, availability_slots, pacing_rules, closures. Every change propagates immediately to the app.

Drinks variant: services become time bands; capacity is in people; table types from Vie nocturne appear as separate inventory with their own counts.

### Équipe et rôles
Purpose: who can do what.

Sections: members with name, email, phone, role (Propriétaire, Manager, Staff), status (invité, actif, suspendu), last activity; role matrix shown explicitly; invitation flow by email or WhatsApp; the last owner cannot be demoted or removed.

Actions: Inviter, Modifier le rôle, Suspendre, Retirer, Renvoyer l'invitation.

### Notifications
Purpose: what the establishment and the guest receive, and through which channel.

Sections: team alerts (new request, new online waitlist party, deposit failed, review received, guest message) by channel (push, email, WhatsApp) and by role; guest messages (confirmation, reminder at J-1 and H-3, reconfirmation request with one-tap confirm, table ready, thank you) with channel, timing and editable text within LYFE's approved templates; sender identity (venue name on WhatsApp through LYFE's Twilio or Infobip sender); delivery log with status per message.

Actions: toggle, edit timing, edit text, send a test, view the log.

Reads and writes: notification_prefs, templates, messages_log.

---

## 10. Compte

### Paramètres
Purpose: administrative configuration.

Sections: legal entity (raison sociale, ICE, RC, address for invoices); bank details for payouts (IBAN, RIB document); configuration type (Restaurant, Lounge, or both, which enables Vie nocturne); language; timezone; data and privacy (consent texts shown in the app, retention policy, export all data, delete establishment request); integrations (Google Business Profile link for review redirection, Instagram handle, WhatsApp Business number); API access for a future POS link, disabled by default.

### Abonnement
Purpose: the commercial relationship with LYFE.

Sections: plan (single annual subscription), status (essai, actif, expiré), trial end date, renewal date, price, invoices list with download, payment method, usage summary (reservations, guests, messages sent, campaigns) for the period; marketing services add-on status once available.

Actions: Mettre à jour le moyen de paiement, Télécharger une facture, Demander un contact commercial.

### Support
Purpose: get help without leaving the portal.

Sections: help centre search; guides (démarrer, gérer un service, réduire les no-shows, configurer les acomptes); contact form with category and attachment; ticket list with status; WhatsApp support link with hours; status page link.

---

## Cross-cutting rules

Every list has loading, empty, error and permission-denied states designed, not just the happy path.

Every write is optimistic with rollback and a visible saved state. Availability, deposits and check-in additionally use server-side version or idempotency checks so concurrent edits and replayed scans are refused rather than merged.

Every guest-affecting action (confirm, refuse, modify, cancel, no-show, table ready, deposit request) emits the consumer-app notification and the tracking event, so the app and the dashboard never disagree on a reservation's state.

Spend, revenue and average ticket appear only where a transaction source exists. Where none does, the tile is hidden, not estimated.

Phone layout is first-class for Accueil, Réservations, Liste d'attente, Check-in, Briefing, Guest list and Tables minimums. Everything else is tablet and desktop first.

The drinks configuration is not a second product. It enables Vie nocturne, renames covers to people and services to time bands, adds table types as inventory, and adds dress code and age policy to Ma fiche. All other screens are identical.
