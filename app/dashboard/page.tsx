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
        action={
          <Link
            href="/events/new"
            className="hidden md:inline-flex h-9 px-4 items-center text-sm bg-ink text-white"
          >
            Créer un événement
          </Link>
        }
      />

      <div className="px-4 md:px-8 py-6 md:py-8 max-w-content mx-auto">
        <div className="mb-2">
          <p className="text-sm text-muted">Bonsoir Yassine,</p>
          <h2 className="h-serif text-2xl text-ink mt-1">
            Voici ce qu'il se passe sur Blend Rooftop ce soir.
          </h2>
        </div>

        {/* Quick stats — 4 cards, 2x2 on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <StatCard
            label="Billets vendus aujourd'hui"
            value={ticketsToday}
          >
            <Sparkline data={ticketsTodaySpark} stroke="#C9A64C" />
          </StatCard>
          <StatCard
            label="Revenu cette semaine"
            value={formatMad(revenueThisWeek)}
            trend={{ value: revenueDelta, label: "vs sem. dernière" }}
          />
          <StatCard
            label="Événements à venir"
            value={upcomingCount}
            hint="Cliquer pour filtrer"
            href="/events?filter=live"
          />
          <StatCard
            label="Prochain versement"
            value={nextPayout ? formatMad(nextPayout.amountMad) : "—"}
            hint={
              nextPayout
                ? `le ${formatDate(nextPayout.scheduledFor)} (J+3)`
                : "Aucun versement programmé"
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Upcoming events list */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="h-serif text-lg text-ink">Événements à venir</h3>
              <Link
                href="/events"
                className="text-xs uppercase tracking-badge text-muted hover:text-ink"
              >
                Tout voir →
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
              <CardHeader title="Activité récente" subtitle="Mises à jour en direct" />
              <ActivityFeed />
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
