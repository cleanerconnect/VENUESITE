"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import {
  formatCountdown,
  formatDateTime,
  formatMad,
  formatRelative,
} from "@/lib/format";
import { refundRequests as initial } from "@/lib/mockData";
import type { LyfeEvent, RefundRequest } from "@/lib/types";

export function RefundsTab({ event }: { event: LyfeEvent }) {
  const [items, setItems] = useState<RefundRequest[]>(initial);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const pending = items.filter((r) => r.status === "pending");
  const resolved = items.filter((r) => r.status !== "pending");

  const approve = (id: string) => {
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "approved", resolvedAt: new Date().toISOString() }
          : r,
      ),
    );
  };
  const deny = (id: string) => {
    if (!denyReason.trim()) return;
    setItems((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "denied", resolvedAt: new Date().toISOString() }
          : r,
      ),
    );
    setDenyingId(null);
    setDenyReason("");
  };

  if (event.refundPolicy === "auto") {
    return (
      <Card tone="hero">
        <CardHeader
          title="Remboursements automatiques"
          subtitle="Les demandes éligibles sont approuvées sans votre intervention."
          action={<Badge tone="success">ACTIF</Badge>}
        />
        <div className="grid sm:grid-cols-3 gap-4 mt-2">
          <Rule
            label="Fenêtre de demande"
            value="48 h après l'achat"
          />
          <Rule
            label="Délai minimum avant événement"
            value="7 jours"
          />
          <Rule
            label="Points de fidélité"
            value="Reversés automatiquement"
          />
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card padded={false}>
        <div className="px-6 pt-6 pb-5 border-b border-line">
          <CardHeader
            title="Demandes en attente"
            subtitle={`${pending.length} demande(s) à traiter · SLA 48 h`}
            action={
              pending.length > 0 ? (
                <Badge tone="warning" withDot>
                  {pending.length} EN ATTENTE
                </Badge>
              ) : null
            }
          />
        </div>
        {pending.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Aucune demande en attente.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="px-6 py-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-ink/[0.06] to-ink/[0.12] text-ink text-xs flex items-center justify-center font-semibold">
                      {r.buyerName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="text-ink font-semibold">{r.buyerName}</div>
                      <div className="text-[12px] text-muted mt-0.5 num">
                        {r.tierName} · {formatMad(r.amountMad)} ·{" "}
                        {formatRelative(r.requestedAt)}
                      </div>
                    </div>
                  </div>
                  <Badge tone="warning" withDot>
                    SLA {formatCountdown(r.slaExpiresAt).toUpperCase()}
                  </Badge>
                </div>

                <blockquote className="text-[13px] text-ink bg-bg-soft border-l-2 border-ink/20 pl-3 pr-3 py-2 italic">
                  {r.reason}
                </blockquote>

                {denyingId === r.id ? (
                  <div className="flex flex-col gap-3 bg-bg-soft p-4 rounded-md">
                    <Textarea
                      label="Motif de refus (visible par le client)"
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
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
                        onClick={() => deny(r.id)}
                        disabled={!denyReason.trim()}
                      >
                        Confirmer le refus
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDenyingId(r.id)}
                    >
                      Refuser
                    </Button>
                    <Button size="sm" onClick={() => approve(r.id)}>
                      Approuver le remboursement
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padded={false}>
        <div className="px-6 pt-6 pb-5 border-b border-line">
          <CardHeader title="Historique" subtitle="Demandes résolues" />
        </div>
        <ul className="divide-y divide-line">
          {resolved.length === 0 ? (
            <li className="px-6 py-10 text-sm text-muted text-center">
              Aucun remboursement traité pour le moment.
            </li>
          ) : (
            resolved.map((r) => (
              <li
                key={r.id}
                className="px-6 py-4 flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <div className="text-ink font-medium">{r.buyerName}</div>
                  <div className="text-[12px] text-muted num mt-0.5">
                    {r.tierName} · {formatMad(r.amountMad)} ·{" "}
                    {formatDateTime(r.resolvedAt!)}
                  </div>
                </div>
                <Badge
                  tone={r.status === "approved" ? "success" : "neutral"}
                  withDot
                >
                  {r.status === "approved" ? "REMBOURSÉ" : "REFUSÉ"}
                </Badge>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface/70 border border-line rounded-md p-4">
      <div className="eyebrow text-muted-2">{label}</div>
      <div className="text-[15px] font-semibold text-ink mt-2">{value}</div>
    </div>
  );
}
