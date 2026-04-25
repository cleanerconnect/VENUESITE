"use client";

import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { events } from "@/lib/mockData";
import { formatDateTime } from "@/lib/format";

// Shortcut from the bottom tab bar — picks an event to scan.
// On the day of an event, the live one would be highlighted automatically.
export default function ScannerHubPage() {
  const live = events.filter((e) => e.status === "live");

  return (
    <>
      <TopBar title="Scanner" />
      <div className="px-4 md:px-8 py-6 max-w-content mx-auto">
        <p className="text-sm text-muted mb-4">
          Choisissez l'événement pour lequel scanner les billets ce soir.
        </p>
        <div className="flex flex-col gap-3">
          {live.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">
                Aucun événement en cours pour le moment.
              </p>
            </Card>
          ) : (
            live.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="block bg-surface border border-line shadow-card p-5 hover:border-ink transition-colors"
              >
                <div className="h-serif text-lg text-ink">{e.name}</div>
                <div className="text-xs text-muted mt-0.5">
                  {formatDateTime(e.startsAt)} · {e.venue.name}
                </div>
                <div className="mt-3 text-xs uppercase tracking-badge text-ink">
                  Ouvrir l'onglet Scanner →
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
