import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Button } from "@/components/ui/Button";
import { EventListItem } from "@/components/dashboard/EventListItem";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { events, payouts, ticketsTodaySpark } from "@/lib/mockData";
import { formatDate, formatMad } from "@/lib/format";

export default function DashboardPage() {
  const liveOrPending = events.filter((e) =>
    ["live", "pending"].includes(e.status),
  );
  const upcomingCount = events.filter((e) => e.status === "live").length;
  const ticketsToday = ticketsTodaySpark.reduce((s, n) => s + n, 0);

  // Revenue this week — naive sum of last 7d worth of mock activity.
  const revenueThisWeek = 28430;
  const revenueLastWeek = 24100;
  const revenueDelta =
    ((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100;

  const nextPayout = payouts.find((p) => p.status === "scheduled");

  return (
    <>
      <TopBar
        title="Vue d'ensemble"
        eyebrow="Tableau de bord"
        liveDot
        action={
          <Link
            href="/events/new"
            className="hidden md:inline-flex h-9 px-4 items-center text-[13px] font-medium bg-gradient-to-b from-[#1a1a1a] to-ink text-white rounded-md shadow-xs hover:from-[#2a2a2a] transition-all"
          >
            Créer un événement
          </Link>
        }
      />

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-content mx-auto fade-up">
        {/* Hero greeting */}
        <div className="mb-7">
          <p className="text-[13px] text-muted">Bonsoir Yassine,</p>
          <h2 className="h-hero text-[28px] md:text-[34px] text-ink mt-2 max-w-2xl">
            Voici ce qu'il se passe sur Blend Rooftop ce soir.
          </h2>
        </div>

        {/* Quick stats — 4 cards, 2x2 on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            label="Billets vendus aujourd'hui"
            value={ticketsToday}
            tone="hero"
            accent="linear-gradient(90deg, #D8A83B, #E2B54A 50%, #D8A83B)"
          >
            <Sparkline data={ticketsTodaySpark} stroke="#D8A83B" />
          </StatCard>
          <StatCard
            label="Revenu cette semaine"
            value={formatMad(revenueThisWeek)}
            trend={{ value: revenueDelta, label: "vs sem. dernière" }}
          />
          <StatCard
            label="Événements à venir"
            value={upcomingCount}
            hint="Voir la liste filtrée →"
            href="/events?filter=live"
          />
          <StatCard
            label="Prochain versement"
            value={nextPayout ? formatMad(nextPayout.amountMad) : "—"}
            hint={
              nextPayout
                ? `le ${formatDate(nextPayout.scheduledFor)} · J+3`
                : "Aucun versement programmé"
            }
            tone="royal"
            accent="linear-gradient(90deg, #253E86, #2f4ea3, #253E86)"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 mt-8">
          {/* Upcoming events list */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="h-display text-lg text-ink">Événements à venir</h3>
                <p className="text-[12px] text-muted mt-0.5">
                  Triés par date la plus proche
                </p>
              </div>
              <Link
                href="/events"
                className="text-[12px] font-medium text-muted hover:text-ink flex items-center gap-1 transition-colors"
              >
                Tout voir
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {liveOrPending.length === 0 ? (
                <Card>
                  <p className="text-sm text-muted">
                    Aucun événement à venir. Créez votre premier événement pour
                    commencer.
                  </p>
                  <div className="mt-4">
                    <Button>Créer un événement</Button>
                  </div>
                </Card>
              ) : (
                liveOrPending.map((e) => <EventListItem key={e.id} event={e} />)
              )}
            </div>
          </section>

          {/* Activity feed */}
          <section>
            <Card>
              <CardHeader
                title="Activité récente"
                subtitle="Mises à jour en direct"
                action={
                  <span className="live-dot" aria-label="En direct" />
                }
              />
              <ActivityFeed />
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
