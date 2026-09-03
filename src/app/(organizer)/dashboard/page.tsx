import Link from "next/link";
import {
  CalendarDays,
  Plus,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { getEventRepository } from "@/lib/data/events";
import { Card } from "@/components/ui/Card";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { HeroTonight } from "@/components/cards/HeroTonight";
import { AINudgeCard } from "@/components/cards/AINudgeCard";
import { InsightOfTheDay } from "@/components/cards/InsightOfTheDay";
import { RoleGate } from "@/lib/auth/role";
import { StatTile } from "@/components/cards/StatTile";
import { Sparkline } from "@/components/cards/Sparkline";
import { UpcomingEventRow } from "@/components/cards/UpcomingEventRow";
import { ActivityFeedItem } from "@/components/cards/ActivityFeedItem";
import { LivePulse } from "@/components/motion/LivePulse";
import { MobileLiveEventCard } from "@/components/cards/MobileLiveEventCard";
import { MobileNudgeStack } from "@/components/cards/MobileNudgeStack";
import { MobileTodayCard } from "@/components/cards/MobileTodayCard";
import { MobileSalesPulseCard } from "@/components/cards/MobileSalesPulseCard";
import { MobileUpcomingEventsRow } from "@/components/cards/MobileUpcomingEventsRow";
import { OnboardingBanner } from "@/components/cards/OnboardingBanner";

// `daysToPayout` and the live-event window depend on Date.now(); without
// this, Next prerenders the page at build time and freezes both values
// until the next deploy.
export const dynamic = "force-dynamic";

const NOW = new Date("2026-04-25T19:30:00+01:00").getTime();

export default async function DashboardPage() {
  // Server component: the repository is awaited here and the payload
  // passed down, so nothing below this line knows where data comes from.
  const repo = getEventRepository();
  const [data, insight, activeBoosts] = await Promise.all([
    repo.getOverview(),
    repo.getInsightOfTheDay(),
    repo.countActiveBoostsByEvent(),
  ]);
  const payoutDate = new Date(data.nextPayout.scheduledFor);
  const daysToPayout = Math.max(
    0,
    Math.ceil(
      (payoutDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );

  // === Mobile feed prep ===
  // Live event detection: any upcoming event whose start is within the
  // next 6 hours, or any event currently in `live` state.
  const liveEvent = data.upcomingEvents.find((e) => {
    if (e.status.state === "live") return true;
    const startsAt = new Date(e.startsAt).getTime();
    const diffH = (startsAt - NOW) / 3600_000;
    return diffH >= 0 && diffH <= 6;
  });

  const upcomingForMobile = data.upcomingEvents
    .filter(
      (e) => e.status.state === "on_sale" || e.status.state === "in_review",
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .slice(0, 3);

  // Today-window revenue derived from the seeded ticketsToday count
  // and a weighted average tier price across the demo portfolio.
  const revenueTodayMad = data.ticketsToday.count * 640;

  return (
    <>
      {/* Cross-breakpoint onboarding gate. Renders only when the active
          profile hasn't finished the /onboarding wizard. */}
      <OnboardingBanner />

      {/* === MOBILE feed (vertical card stack) === */}
      <div className="md:hidden space-y-4">
        {liveEvent ? (
          <MobileLiveEventCard
            event={liveEvent}
            hoursAway={
              liveEvent.status.state === "live"
                ? 0
                : Math.max(
                    0,
                    (new Date(liveEvent.startsAt).getTime() - NOW) /
                      3600_000,
                  )
            }
            scanRatePct={0}
            scannedCount={0}
            capacity={liveEvent.tiers.reduce((s, t) => s + t.quantity, 0)}
          />
        ) : null}

        <MobileNudgeStack />

        <MobileTodayCard />

        <MobileSalesPulseCard
          amountMad={revenueTodayMad}
          deltaPct={data.ticketsToday.deltaPctVsYesterday}
          series={data.ticketsToday.series24h}
        />

        <MobileUpcomingEventsRow events={upcomingForMobile} />

        <InsightOfTheDay insight={insight} />
      </div>

      {/* === DESKTOP layout (existing bento) === */}
      <Stagger className="hidden md:block space-y-6 md:space-y-7">
        {/* === Hero greeting + Tonight card === */}
        <StaggerItem>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(360px,420px)] gap-5">
            {/* Greeting + AI nudge column */}
            <div className="flex flex-col gap-5">
              <Card variant="canvas-2" size="lg" className="min-h-[220px]">
                <div className="flex flex-col h-full justify-between gap-6">
                  <div>
                    <div className="text-eyebrow text-ink-mute">Bonsoir</div>
                    <h1
                      className="text-h1 text-ink mt-2 leading-[1.05] max-w-md"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Bonsoir, {data.organizer.firstName}.{" "}
                      <span
                        className="font-serif-italic text-violet-deep"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {data.organizer.greetingClause}
                      </span>
                    </h1>
                    <p className="text-body text-ink-soft mt-3 max-w-md">
                      {data.organizer.greetingSubline}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <RoleGate>
                      <Link
                        href="/events/new"
                        className="inline-flex items-center gap-2 h-14 px-6 bg-ink text-canvas rounded-[var(--radius-sm)] text-[14px] font-semibold hover:bg-ink-soft transition-colors"
                      >
                        <Plus size={16} strokeWidth={2} />
                        Créer un événement
                      </Link>
                    </RoleGate>
                    <Link
                      href="/events"
                      className="inline-flex items-center gap-2 h-10 px-4 text-[13px] font-semibold border border-line rounded-[var(--radius-sm)] bg-surface text-ink hover:border-ink transition-colors"
                    >
                      Voir tous les événements →
                    </Link>
                  </div>
                </div>
              </Card>

              {/* AI nudge, moved out of Tonight, lives here on desktop. */}
              <AINudgeCard />
            </div>

            {/* Dark headline hero, switches between live + preparing modes */}
            <HeroTonight data={data.headline} />
          </div>
        </StaggerItem>

        {/* === Bento KPI grid === */}
        <StaggerItem>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tickets sold today (2-col span) */}
            <StatTile
              variant="sand"
              span={2}
              label="Billets vendus aujourd'hui"
              value={data.ticketsToday.count}
              delta={{
                value: data.ticketsToday.deltaPctVsYesterday,
                period: "vs hier",
              }}
              icon={
                <ShoppingBag
                  size={16}
                  strokeWidth={1.8}
                  className="text-ink-soft"
                />
              }
            >
              <div className="flex items-end justify-between -mt-1">
                <div className="text-meta text-ink-soft">
                  Pic à 21h, suite attendue jusqu'à 23h
                </div>
                <Sparkline data={data.ticketsToday.series24h} />
              </div>
            </StatTile>

            {/* Revenue this week */}
            <StatTile
              variant="surface"
              label="Revenu cette semaine"
              value={data.revenueWeek.amountMad}
              valueSuffix="MAD"
              delta={{
                value: data.revenueWeek.deltaPctVsLastWeek,
                period: "vs sem. dernière",
              }}
            />

            {/* Insight of the day, top-right of the bento, single column. */}
            <InsightOfTheDay insight={insight} />

            {/* Next payout (2-col span) */}
            <StatTile
              variant="sage"
              span={2}
              label="Prochain versement"
              value={data.nextPayout.amountMad}
              valueSuffix="MAD"
              icon={
                <Wallet size={16} strokeWidth={1.8} className="text-ink-soft" />
              }
            >
              <div className="flex items-center gap-3 flex-wrap text-meta text-ink-soft">
                <span className="inline-flex items-center gap-1.5 h-7 px-2.5 bg-surface/70 rounded-full font-semibold text-ink">
                  dans {daysToPayout} {daysToPayout > 1 ? "jours" : "jour"}
                </span>
                <span>
                  Versé le{" "}
                  <span className="font-semibold text-ink">
                    {payoutDate.toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>{" "}
                  · J+3 après l'événement
                </span>
              </div>
            </StatTile>

            {/* Upcoming events count, paired with payout on row 2 to balance
                the bento. */}
            <StatTile
              variant="surface"
              span={2}
              label="Événements à venir"
              value={data.upcomingEventsCount}
              hint="Cliquer pour les filtrer"
              icon={
                <CalendarDays
                  size={16}
                  strokeWidth={1.8}
                  className="text-ink-soft"
                />
              }
            />
          </div>
        </StaggerItem>

        {/* === Events list + Activity feed === */}
        <StaggerItem>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,380px)] gap-5">
            {/* Events list */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h2 text-ink">Événements à venir</h2>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-1.5 h-10 px-3 text-[13px] font-semibold border border-line bg-surface rounded-[var(--radius-sm)] text-ink hover:border-ink transition-colors"
                >
                  Tout voir →
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {data.upcomingEvents
                  .filter((e) => e.status.state !== "draft")
                  .map((event) => (
                    <UpcomingEventRow
                      key={event.id}
                      event={event}
                      activeBoosts={activeBoosts[event.id] ?? 0}
                    />
                  ))}
              </div>
            </section>

            {/* Activity feed */}
            <section>
              <Card variant="surface" size="md">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-h3 text-ink">Activité récente</h2>
                  <LivePulse label="LIVE" />
                </div>
                <p className="text-meta text-ink-mute mb-2">
                  Dix dernières actions, en direct.
                </p>
                <ul className="divide-y divide-line-soft">
                  {data.activity.map((item) => (
                    <ActivityFeedItem key={item.id} item={item} />
                  ))}
                </ul>
              </Card>
            </section>
          </div>
        </StaggerItem>
      </Stagger>
    </>
  );
}
