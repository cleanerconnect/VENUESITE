"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { invoices, payouts } from "@/lib/mockData";
import {
  formatCountdown,
  formatDate,
  formatDateTime,
  formatMad,
} from "@/lib/format";
import { IconDownload } from "@/components/layout/icons";
import type { Payout } from "@/lib/types";

export default function SettlementsPage() {
  const next = payouts.find((p) => p.status !== "paid") ?? payouts[0];
  const history = payouts.filter((p) => p.status === "paid");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <>
      <TopBar title="Versements" />
      <div className="px-4 md:px-8 py-6 max-w-content mx-auto flex flex-col gap-6">
        {/* Next payout */}
        {next ? <NextPayoutCard payout={next} /> : null}

        {/* History */}
        <Card padded={false}>
          <div className="p-6 border-b border-line">
            <CardHeader
              title="Historique des versements"
              subtitle="J+3 après la fin de chaque événement"
            />
            <div className="grid sm:grid-cols-3 gap-3">
              <Input
                label="Du"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <Input
                label="Au"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <div className="flex items-end">
                <Button variant="secondary" size="md" fullWidth>
                  Filtrer
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-badge text-muted text-left border-b border-line">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Montant</th>
                  <th className="px-6 py-3">Référence</th>
                  <th className="px-6 py-3 text-right">Billets</th>
                  <th className="px-6 py-3">Statut</th>
                  <th className="px-6 py-3 text-right">Relevé</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-b border-line/60">
                    <td className="px-6 py-3 text-ink num">
                      {formatDate(p.paidAt!)}
                    </td>
                    <td className="px-6 py-3 text-right text-ink num font-medium">
                      {formatMad(p.amountMad)}
                    </td>
                    <td className="px-6 py-3 text-muted text-xs num">
                      {p.reference}
                    </td>
                    <td className="px-6 py-3 text-right num">
                      {p.ticketCount}
                    </td>
                    <td className="px-6 py-3">
                      <Badge tone="success">VERSÉ</Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <a
                        href={p.statementUrl}
                        className="text-xs uppercase tracking-badge text-muted hover:text-ink inline-flex items-center gap-1"
                      >
                        <IconDownload />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Invoices */}
        <Card padded={false}>
          <div className="p-6 border-b border-line">
            <CardHeader
              title="Factures de commission LYFE"
              subtitle="Émises à votre nom pour les besoins comptables (4 % du revenu)"
              action={
                <Button variant="secondary" size="sm">
                  Synthèse annuelle
                </Button>
              }
            />
          </div>
          <ul className="divide-y divide-line">
            {invoices.map((i) => (
              <li
                key={i.id}
                className="px-6 py-4 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-ink num text-sm">{i.number}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {i.description} · {formatDate(i.issuedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="num text-sm text-ink">
                    {formatMad(i.amountMad)}
                  </div>
                  <a
                    href={i.pdfUrl}
                    className="text-xs uppercase tracking-badge text-muted hover:text-ink inline-flex items-center gap-1"
                  >
                    <IconDownload />
                    PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function NextPayoutCard({ payout }: { payout: Payout }) {
  const tone =
    payout.status === "scheduled"
      ? "info"
      : payout.status === "processing"
        ? "warning"
        : "success";
  const label =
    payout.status === "scheduled"
      ? "PROGRAMMÉ"
      : payout.status === "processing"
        ? "EN TRAITEMENT"
        : "VERSÉ";
  return (
    <Card>
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div>
          <div className="text-[10px] uppercase tracking-badge text-muted">
            Prochain versement
          </div>
          <div className="h-serif text-4xl text-ink mt-2 num">
            {formatMad(payout.amountMad)}
          </div>
          <div className="text-sm text-muted mt-1 num">
            le {formatDate(payout.scheduledFor)} ·{" "}
            {formatCountdown(payout.scheduledFor)}
          </div>
          <div className="text-xs text-muted mt-3 num">
            {payout.ticketCount} billets · {payout.eventIds.length} événement(s)
          </div>
          <div className="text-xs text-muted mt-1 num">
            Réf. {payout.reference}
          </div>
        </div>
        <div className="flex md:flex-col items-end gap-3">
          <Badge tone={tone}>{label}</Badge>
          <div className="text-xs text-muted">{formatDateTime(payout.scheduledFor)}</div>
        </div>
      </div>
    </Card>
  );
}
