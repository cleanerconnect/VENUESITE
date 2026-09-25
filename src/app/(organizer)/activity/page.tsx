"use client";

import { Card } from "@/components/ui/Card";
import { LivePulse } from "@/components/motion/LivePulse";
import { ActivityFeedItem } from "@/components/cards/ActivityFeedItem";
import { PageHeader } from "@/components/ui/PageHeader";
import { useEventQuery } from "@/lib/data/useQuery";
import { QueryState } from "@/components/data/QueryState";
import { EntityListSkeleton } from "@/components/ui/Skeleton";

// Activity feed full-screen route. On desktop the feed lives in the
// dashboard right rail; on mobile it's promoted to its own surface so
// the homescreen stays focused on actionable cards.
export default function ActivityPage() {
  const overview = useEventQuery((repo) => repo.getOverview(), []);
  const activity = overview.data?.activity ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activité récente"
        badge={<LivePulse label="LIVE" />}
        subtitle="Tout ce qui se passe sur vos événements, en temps réel."
      />

      {overview.status !== "ready" || activity.length === 0 ? (
        <QueryState
          query={{ ...overview, isEmpty: activity.length === 0 }}
          label="Chargement de l'activité"
          skeleton={<EntityListSkeleton rows={6} />}
          empty={{
            title: "Rien pour l'instant",
            body: "L'activité de vos événements apparaîtra ici en temps réel.",
          }}
        />
      ) : (
        <Card variant="surface" size="md">
          <ul className="divide-y divide-line-soft">
            {activity.map((item) => (
              <ActivityFeedItem key={item.id} item={item} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
