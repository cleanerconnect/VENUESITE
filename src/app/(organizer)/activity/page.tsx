"use client";

import { Card } from "@/components/ui/Card";
import { LivePulse } from "@/components/motion/LivePulse";
import { ActivityFeedItem } from "@/components/cards/ActivityFeedItem";
import { getOrganizerOverview } from "@/lib/mock/organizer";

// Activity feed full-screen route. On desktop the feed lives in the
// dashboard right rail; on mobile it's promoted to its own surface so
// the homescreen stays focused on actionable cards.
export default function ActivityPage() {
  const data = getOrganizerOverview();
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-h1 text-ink">Activité récente</h1>
          <LivePulse label="LIVE" />
        </div>
        <p className="text-body text-ink-soft mt-1.5">
          Tout ce qui se passe sur vos événements, en temps réel.
        </p>
      </div>

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
