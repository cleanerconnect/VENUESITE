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

  // Optimistic — flip status immediately, real impl rolls back on 4xx/5xx.
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
      <Card>
        <CardHeader
          title="Remboursements automatiques"
          subtitle="Les demandes éligibles sont approuvées sans votre intervention. Voici l'historique."
        />
        <p className="text-sm text-muted">
          Aucune action requise. Politique LYFE : remboursement intégral
          (valeur faciale + frais de service) si demandé sous 48 h après
          l'achat ET 7 jours minimum avant l'événement. Les points de fidélité
          gagnés sur le billet sont automatiquement annulés.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card padded={false}>
        <div className="p-6 border-b border-line">
          <CardHeader
            title="Demandes en attente"
            subtitle={`${pending.length} à traiter · SLA 48 h`}
          />
        </div>
        {pending.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            Aucune demande en attente.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="p-6 flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-ink font-medium">{r.buyerName}</div>
                    <div className="text-xs text-muted mt-0.5 num">
                      {r.tierName} · {formatMad(r.amountMad)} · demandé{" "}
                      {formatRelative(r.requestedAt)}
                    </div>
                  </div>
                  <Badge tone="warning">
                    SLA {formatCountdown(r.slaExpiresAt)}
                  </Badge>
                </div>

                <p className="text-sm text-ink bg-bg border border-line p-3">
                  « {r.reason} »
                </p>

                {denyingId === r.id ? (
                  <div className="flex flex-col gap-2">
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
        <div className="p-6 border-b border-line">
          <CardHeader title="Historique" />
        </div>
        <ul className="divide-y divide-line">
          {resolved.length === 0 ? (
            <li className="p-6 text-sm text-muted text-center">
              Aucun remboursement traité pour le moment.
            </li>
          ) : (
            resolved.map((r) => (
              <li
                key={r.id}
                className="px-6 py-4 flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <div className="text-ink">{r.buyerName}</div>
                  <div className="text-xs text-muted num">
                    {r.tierName} · {formatMad(r.amountMad)} ·{" "}
                    {formatDateTime(r.resolvedAt!)}
                  </div>
                </div>
                <Badge tone={r.status === "approved" ? "success" : "neutral"}>
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
