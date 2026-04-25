"use client";

import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { events } from "@/lib/mockData";
import { formatDateTime } from "@/lib/format";
import { IconScan } from "@/components/layout/icons";

export default function ScannerHubPage() {
  const live = events.filter((e) => e.status === "live");

  return (
    <>
      <TopBar title="Scanner" eyebrow="Contrôle d'accès" />
      <div className="px-4 md:px-8 py-6 max-w-content mx-auto fade-up">
        <p className="text-[14px] text-muted mb-5 max-w-xl leading-relaxed">
          Choisissez l'événement pour lequel scanner les billets ce soir.
          Sur mobile, gardez cet écran ouvert pour démarrer rapidement la caméra.
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
                className="card-link block bg-surface border border-line rounded-lg shadow-card overflow-hidden"
              >
                <div className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-md bg-gradient-to-br from-ink to-[#2a2a2a] text-white flex items-center justify-center shrink-0">
                    <IconScan />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-display text-[17px] text-ink truncate">
                      {e.name}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5 num">
                      {formatDateTime(e.startsAt)} · {e.venue.name}
                    </div>
                  </div>
                  <div className="text-[11px] uppercase tracking-badge font-semibold text-ink shrink-0 hidden sm:flex items-center gap-1">
                    Scanner
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M5 3l3 3-3 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
