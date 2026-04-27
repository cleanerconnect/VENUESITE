"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { getRefundRequests } from "@/lib/mock/events";
import {
  formatDateTimeFR,
  formatMAD,
  formatRelativeFR,
} from "@/lib/utils/format";
import type { LyfeEvent, RefundRequest } from "@/lib/types/domain";

// SLA copy: gold under 12h, danger under 2h, otherwise neutral.
function slaTone(slaIso: string): "warning" | "danger" | "neutral" {
  const ms = new Date(slaIso).getTime() - Date.now();
  const h = ms / 3_600_000;
  if (h < 2) return "danger";
  if (h < 12) return "warning";
  return "neutral";
}

function slaLabel(slaIso: string) {
  const ms = new Date(slaIso).getTime() - Date.now();
  if (ms <= 0) return "EXPIRÉ";
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}H RESTANTES`;
  return `${Math.floor(h / 24)}J RESTANTS`;
}

export function RefundsTab({ event }: { event: LyfeEvent }) {
  const [items, setItems] = useState<RefundRequest[]>(getRefundRequests());
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const { toast } = useToast();

  const pending = items.filter((r) => r.status === "pending");
  const resolved = items.filter((r) => r.status !== "pending");

  // Optimistic — flip immediately, toast confirms with undo.
  const approve = (req: RefundRequest) => {
    const before = items;
    setItems((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? { ...r, status: "approved", resolvedAt: new Date().toISOString() }
          : r,
      ),
    );
    toast({
      tone: "success",
      title: "Remboursement approuvé",
      description: `${req.buyerName} · ${formatMAD(req.amountMad)}`,
      undo: () => setItems(before),
    });
  };

  const deny = (req: RefundRequest) => {
    if (!denyReason.trim()) return;
    const before = items;
    setItems((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? { ...r, status: "denied", resolvedAt: new Date().toISOString() }
          : r,
      ),
    );
    toast({
      tone: "danger",
      title: "Remboursement refusé",
      description: req.buyerName,
      undo: () => setItems(before),
    });
    setDenyingId(null);
    setDenyReason("");
  };

  if (event.refundPolicy === "auto") {
    return (
      <Card variant="sage" size="md">
        <h3 className="text-h3 text-ink">Remboursements automatiques</h3>
        <p className="text-[14px] text-ink-soft mt-2 leading-relaxed max-w-xl">
          Les demandes éligibles sont approuvées sans votre intervention.
          Politique LYFE : remboursement intégral si demandé sous 48 h après
          l'achat ET 7 jours minimum avant l'événement. Les points de
          fidélité gagnés sur le billet sont automatiquement annulés.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          <Rule label="Fenêtre de demande" value="48 h après l'achat" />
          <Rule label="Délai minimum" value="7 j avant l'événement" />
          <Rule label="Points de fidélité" value="Reversés auto." />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* === Pending queue (rose-tinted) === */}
      {pending.length > 0 ? (
        <Card variant="rose" size="md">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-h3 text-ink">
              {pending.length} demande{pending.length > 1 ? "s" : ""} en attente
            </h3>
            <Pill tone="warning" dot>
              SLA 48 H
            </Pill>
          </div>
          <p className="text-meta text-ink-soft">
            Approuvez ou refusez chaque demande. Le client est notifié
            immédiatement.
          </p>

          <ul className="mt-5 flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {pending.map((r) => {
                const tone = slaTone(r.slaExpiresAt);
                return (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      x: 24,
                      transition: { duration: 0.22 },
                    }}
                    className="bg-surface rounded-[var(--radius-md)] p-5 border border-line"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-[12px] font-bold text-ink shrink-0"
                          style={{ background: "var(--color-tint-peach)" }}
                        >
                          {r.buyerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-ink">
                            {r.buyerName}
                          </div>
                          <div className="text-meta text-ink-soft num">
                            {r.tierName} · {formatMAD(r.amountMad)} ·{" "}
                            {formatRelativeFR(r.requestedAt)}
                          </div>
                        </div>
                      </div>
                      <div
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] rounded-full h-6 px-2.5"
                        style={{
                          background:
                            tone === "danger"
                              ? "rgba(161,44,44,0.12)"
                              : tone === "warning"
                                ? "rgba(201,166,76,0.16)"
                                : "rgba(10,31,61,0.06)",
                          color:
                            tone === "danger"
                              ? "var(--color-danger)"
                              : tone === "warning"
                                ? "var(--color-gold-deep)"
                                : "var(--color-ink)",
                        }}
                      >
                        <Clock size={11} strokeWidth={2} />
                        {slaLabel(r.slaExpiresAt)}
                      </div>
                    </div>

                    <blockquote className="mt-4 text-[13px] italic text-ink-soft border-l-2 border-line pl-3">
                      {r.reason}
                    </blockquote>

                    {denyingId === r.id ? (
                      <div className="mt-4 bg-canvas-2/60 rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
                        <Textarea
                          label="Motif de refus (visible par le client)"
                          value={denyReason}
                          onChange={(e) => setDenyReason(e.target.value)}
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setDenyingId(null);
                              setDenyReason("");
                            }}
                          >
                            Annuler
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deny(r)}
                            disabled={!denyReason.trim()}
                          >
                            Confirmer le refus
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDenyingId(r.id)}
                        >
                          Refuser
                        </Button>
                        <Button size="sm" onClick={() => approve(r)}>
                          Approuver
                        </Button>
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </Card>
      ) : null}

      {/* === Resolved history === */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="px-6 pt-6 pb-3">
          <h3 className="text-h3 text-ink">Historique</h3>
          <p className="text-meta text-ink-soft mt-1">
            Demandes résolues
          </p>
        </div>
        {resolved.length === 0 ? (
          <p className="px-6 py-10 text-center text-meta text-ink-mute">
            Aucun remboursement traité pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {resolved.map((r) => (
              <li
                key={r.id}
                className="px-6 py-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-[14px] font-medium text-ink">
                    {r.buyerName}
                  </div>
                  <div className="text-meta text-ink-mute num mt-0.5">
                    {r.tierName} · {formatMAD(r.amountMad)} ·{" "}
                    {formatDateTimeFR(r.resolvedAt!)}
                  </div>
                </div>
                <Pill tone={r.status === "approved" ? "success" : "danger"} dot>
                  {r.status === "approved" ? "REMBOURSÉ" : "REFUSÉ"}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface/60 rounded-[var(--radius-sm)] p-4">
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div className="text-[14px] font-bold text-ink mt-2">{value}</div>
    </div>
  );
}
