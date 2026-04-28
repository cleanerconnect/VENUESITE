import Link from "next/link";
import {
  CalendarDays,
  Plus,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { getOrganizerOverview } from "@/lib/mock/organizer";
import { formatMAD } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { HeroTonight } from "@/components/cards/HeroTonight";
import { AINudgeCard } from "@/components/cards/AINudgeCard";
import { InsightOfTheDay } from "@/components/cards/InsightOfTheDay";
import { StatTile } from "@/components/cards/StatTile";
import { Sparkline } from "@/components/cards/Sparkline";
import { UpcomingEventRow } from "@/components/cards/UpcomingEventRow";
import { ActivityFeedItem } from "@/components/cards/ActivityFeedItem";
import { LivePulse } from "@/components/motion/LivePulse";

export default function DashboardPage() {
  const data = getOrganizerOverview();
  const payoutDate = new Date(data.nextPayout.scheduledFor);
  const daysToPayout = Math.max(
    0,
    Math.ceil(
      (payoutDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );

  return (
    <Stagger className="space-y-6 md:space-y-7">
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
                  <Link
                    href="/events/new"
                    className="inline-flex items-center gap-2 h-10 px-4 bg-ink text-canvas rounded-[var(--radius-sm)] text-[13px] font-semibold hover:bg-ink-soft transition-colors"
                  >
                    <Plus size={16} strokeWidth={2} />
                    Créer un événement
                  </Link>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-2 h-10 px-4 text-[13px] font-semibold text-ink hover:text-violet-deep transition-colors"
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
          <InsightOfTheDay />

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
                className="text-meta font-semibold text-ink-soft hover:text-ink transition-colors"
              >
                Tout voir →
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {data.upcomingEvents
                .filter((e) => e.status !== "draft")
                .map((event) => (
                  <UpcomingEventRow key={event.id} event={event} />
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
  );
}
