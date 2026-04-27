"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Download, ScanLine, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LivePulse } from "@/components/motion/LivePulse";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { getScanLog } from "@/lib/mock/events";
import { formatRelativeFR } from "@/lib/utils/format";

// Door-day surface. Big "Lancer le scanner" CTA. Live counter. Last 10
// scans streaming below. The mobile fullscreen camera mock is in the
// dialog content.
export function ScannerTab() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const log = getScanLog();
  const scanned = 247;
  const total = 500;
  const remaining = total - scanned;

  return (
    <div className="space-y-5">
      {/* === Counter + launch === */}
      <Card variant="ink" size="hero" glow>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <LivePulse />
              <span className="text-eyebrow text-canvas/55">
                Avancement des scans
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-3 num">
              <span
                className="font-extrabold text-canvas"
                style={{ fontSize: 64, lineHeight: 1, letterSpacing: "-0.04em" }}
              >
                <AnimatedNumber value={scanned} />
              </span>
              <span className="text-canvas/55 text-h3">/ {total}</span>
            </div>
            <div className="text-[13px] text-canvas/65 mt-2 num">
              Encore {remaining} billets à scanner
            </div>
            <div className="mt-4 max-w-sm">
              <ProgressBar
                value={scanned}
                max={total}
                tone="gold"
                size="sm"
                trackClassName="bg-canvas/10"
              />
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setOpen(true)}
            iconLeft={<ScanLine size={18} strokeWidth={1.8} />}
          >
            Lancer le scanner
          </Button>
        </div>
      </Card>

      {/* === Manual lookup + offline === */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card variant="surface" size="md">
          <h3 className="text-h3 text-ink">Recherche manuelle</h3>
          <p className="text-meta text-ink-soft mt-1 mb-5">
            Si la caméra est indisponible, saisissez le code à 8 caractères
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LYFE-XXXX-XXXX"
              className="flex-1 h-12 px-3.5 bg-canvas-2/60 border border-line rounded-[var(--radius-sm)] text-ink num text-[14px] outline-none focus:border-ink transition-colors"
            />
            <Button size="md" disabled={code.length < 6}>
              Vérifier
            </Button>
          </div>
        </Card>

        <Card variant="canvas-2" size="md">
          <h3 className="text-h3 text-ink">Mode hors ligne</h3>
          <p className="text-meta text-ink-soft mt-1 mb-5 leading-relaxed">
            Téléchargez la liste signée pour scanner sans réseau. La synchro se fait dès retour de la connexion.
          </p>
          <Button
            variant="secondary"
            iconLeft={<Download size={14} strokeWidth={1.8} />}
          >
            Télécharger la liste
          </Button>
          <div
            className="mt-4 flex items-start gap-2.5 p-3 rounded-[var(--radius-sm)]"
            style={{ background: "rgba(134,91,166,0.10)" }}
          >
            <Sparkles size={14} className="text-violet-deep mt-0.5 shrink-0" />
            <div className="text-meta text-ink-soft leading-relaxed">
              Les doublons sont gérés côté serveur. Tout staff scannant le
              même code reçoit une alerte sonore.
            </div>
          </div>
        </Card>
      </div>

      {/* === Live scan log === */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <h3 className="text-h3 text-ink">Derniers scans</h3>
            <p className="text-meta text-ink-soft mt-1">
              10 dernières entrées, en direct
            </p>
          </div>
          <LivePulse label="LIVE" />
        </div>
        <ul className="divide-y divide-line-soft">
          {log.map((s) => (
            <li
              key={s.id}
              className="px-6 py-3.5 flex items-center justify-between gap-3 text-[13px]"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(47,107,61,0.14)",
                    color: "var(--color-success)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="m4 7.5 2 2 4-5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <div className="font-semibold text-ink">{s.attendeeName}</div>
                  <div className="text-meta text-ink-mute num">{s.code}</div>
                </div>
              </div>
              <div className="text-meta text-ink-mute num">
                par {s.staff} · {formatRelativeFR(s.at)}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* === Camera dialog === */}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Scanner, caméra"
        size="lg"
      >
        <div className="aspect-square bg-ink rounded-[var(--radius-md)] relative overflow-hidden flex items-center justify-center">
          {/* Corner brackets */}
          <div className="absolute inset-8 rounded-[var(--radius-md)]">
            <Bracket position="top-left" />
            <Bracket position="top-right" />
            <Bracket position="bottom-left" />
            <Bracket position="bottom-right" />
            {/* Sweeping line */}
            <motion.div
              className="absolute left-2 right-2 h-px bg-violet"
              initial={{ top: "0%", opacity: 0.8 }}
              animate={{ top: "100%", opacity: [0.8, 1, 0.8] }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>
          <div className="text-center text-canvas/85 px-4 relative">
            <ScanLine size={36} strokeWidth={1.6} className="mx-auto" />
            <p className="text-[14px] mt-3">
              Centrer le QR du billet dans le cadre
            </p>
            <p className="text-meta text-canvas/50 mt-1">
              Permission caméra demandée à l'ouverture
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Bracket({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const map: Record<typeof position, string> = {
    "top-left": "top-0 left-0 border-t-2 border-l-2",
    "top-right": "top-0 right-0 border-t-2 border-r-2",
    "bottom-left": "bottom-0 left-0 border-b-2 border-l-2",
    "bottom-right": "bottom-0 right-0 border-b-2 border-r-2",
  };
  return (
    <span
      aria-hidden
      className={`absolute h-7 w-7 border-violet ${map[position]}`}
      style={{
        borderTopLeftRadius: position === "top-left" ? "8px" : 0,
        borderTopRightRadius: position === "top-right" ? "8px" : 0,
        borderBottomLeftRadius: position === "bottom-left" ? "8px" : 0,
        borderBottomRightRadius: position === "bottom-right" ? "8px" : 0,
      }}
    />
  );
}
