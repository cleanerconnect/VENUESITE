"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ScanLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LivePulse } from "@/components/motion/LivePulse";
import { getAllEvents } from "@/lib/mock/events";
import { formatDateTimeFR } from "@/lib/utils/format";

// Picker — chooses the event whose Scanner tab to open. On the day of an
// event, the live one is highlighted with a hero treatment so it's
// thumb-impossible to miss.
export default function ScannerHubPage() {
  const live = getAllEvents().filter((e) => e.status === "live");
  const tonight = live[0];
  const others = live.slice(1);

  return (
    <div className="space-y-5 -mx-4 md:mx-0">
      {/* === Header === */}
      <div className="px-4 md:px-0">
        <h1 className="text-h1 text-ink">Scanner</h1>
        <p className="text-body text-ink-soft mt-1.5">
          Choisissez l'événement et lancez le contrôle d'accès.
        </p>
      </div>

      {/* === Tonight — the headline === */}
      {tonight ? (
        <Link href={`/events/${tonight.id}`}>
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="block"
          >
            <Card variant="ink" size="hero" glow>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <LivePulse />
                    <span className="text-eyebrow text-canvas/55">
                      Ce soir
                    </span>
                  </div>
                  <h2
                    className="text-canvas mt-3 max-w-md"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 600,
                      fontSize: 28,
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {tonight.name}
                  </h2>
                  <div className="text-meta text-canvas/65 mt-1.5 num">
                    {formatDateTimeFR(tonight.startsAt)} ·{" "}
                    {tonight.venue.name}
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-2 h-12 px-5 rounded-full bg-gold text-ink text-[14px] font-bold"
                >
                  <ScanLine size={16} strokeWidth={1.8} />
                  Lancer le scanner
                </span>
              </div>
              <div
                className="mt-7 pt-6 border-t border-canvas/10 grid grid-cols-3 gap-x-6 num"
              >
                <Stat label="Vendus" value="247" />
                <Stat label="Capacité" value="500" />
                <Stat label="Reste" value="253" />
              </div>
            </Card>
          </motion.div>
        </Link>
      ) : (
        <div className="px-4 md:px-0">
          <Card variant="canvas-2" size="md">
            <p className="text-[14px] text-ink-soft">
              Aucun événement en cours pour le moment.
            </p>
          </Card>
        </div>
      )}

      {/* === Other live events === */}
      {others.length > 0 ? (
        <div className="px-4 md:px-0 space-y-3">
          <div className="text-eyebrow text-ink-mute">Autres événements en vente</div>
          {others.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="block bg-surface border border-line rounded-[var(--radius-md)] p-4 hover:shadow-soft transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div
                  aria-hidden
                  className="h-12 w-12 rounded-[12px] bg-gradient-to-br from-tint-sand to-gold-soft flex items-center justify-center shrink-0"
                >
                  <ScanLine
                    size={18}
                    strokeWidth={1.8}
                    className="text-ink-soft"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-ink truncate">
                    {e.name}
                  </div>
                  <div className="text-meta text-ink-mute mt-0.5 num truncate">
                    {formatDateTimeFR(e.startsAt)} · {e.venue.name}
                  </div>
                </div>
                <ArrowRight size={14} strokeWidth={1.8} className="text-ink-mute shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "rgba(250,247,240,0.55)" }}
      >
        {label}
      </div>
      <div className="text-h3 text-canvas mt-1.5">{value}</div>
    </div>
  );
}
