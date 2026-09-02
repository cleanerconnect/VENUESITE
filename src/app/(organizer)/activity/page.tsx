"use client";

import { Card } from "@/components/ui/Card";
import { LivePulse } from "@/components/motion/LivePulse";
import { ActivityFeedItem } from "@/components/cards/ActivityFeedItem";
import { getOrganizerOverview } from "@/lib/mock/organizer";
import { PageHeader } from "@/components/ui/PageHeader";

// Activity feed full-screen route. On desktop the feed lives in the
// dashboard right rail; on mobile it's promoted to its own surface so
// the homescreen stays focused on actionable cards.
export default function ActivityPage() {
  const data = getOrganizerOverview();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Activité récente"
        badge={<LivePulse label="LIVE" />}
        subtitle="Tout ce qui se passe sur vos événements, en temps réel."
      />

      <Card variant="surface" size="md">
        <ul className="divide-y divide-line-soft">
          {data.activity.map((item) => (
            <ActivityFeedItem key={item.id} item={item} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
