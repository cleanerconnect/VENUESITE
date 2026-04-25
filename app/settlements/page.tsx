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
      <TopBar title="Versements" eyebrow="Finance" />
      <div className="px-4 md:px-8 py-6 max-w-content mx-auto flex flex-col gap-5 fade-up">
        {next ? <NextPayoutCard payout={next} /> : null}

        {/* History */}
        <Card padded={false}>
          <div className="px-6 pt-6 pb-5 border-b border-line">
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
              <thead>
                <tr className="text-[10px] uppercase tracking-badge text-muted-2 text-left border-b border-line">
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold text-right">Montant</th>
                  <th className="px-6 py-3 font-semibold">Référence</th>
                  <th className="px-6 py-3 font-semibold text-right">Billets</th>
                  <th className="px-6 py-3 font-semibold">Statut</th>
                  <th className="px-6 py-3 font-semibold text-right">Relevé</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-line/60 hover:bg-bg-soft/40 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-ink num">
                      {formatDate(p.paidAt!)}
                    </td>
                    <td className="px-6 py-3.5 text-right text-ink num font-semibold">
                      {formatMad(p.amountMad)}
                    </td>
                    <td className="px-6 py-3.5 text-muted text-[11px] num">
                      {p.reference}
                    </td>
                    <td className="px-6 py-3.5 text-right num">
                      {p.ticketCount}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tone="success" withDot>
                        VERSÉ
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <a
                        href={p.statementUrl}
                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink transition-colors"
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
          <div className="px-6 pt-6 pb-5 border-b border-line">
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
                  <div className="text-ink num text-sm font-medium">
                    {i.number}
                  </div>
                  <div className="text-[12px] text-muted mt-0.5">
                    {i.description} · {formatDate(i.issuedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="num text-sm text-ink font-semibold">
                    {formatMad(i.amountMad)}
                  </div>
                  <a
                    href={i.pdfUrl}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink transition-colors"
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
    <Card tone="royal">
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div>
          <div className="eyebrow text-muted-2">Prochain versement</div>
          <div className="h-hero text-[44px] md:text-[52px] text-ink mt-3 num">
            {formatMad(payout.amountMad)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[13px]">
            <span className="text-ink num font-medium">
              le {formatDate(payout.scheduledFor)}
            </span>
            <span className="chip">{formatCountdown(payout.scheduledFor)}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 mt-6 pt-5 border-t border-line/70 num">
            <Stat label="Billets couverts" value={payout.ticketCount} />
            <Stat
              label="Événements"
              value={Math.max(payout.eventIds.length, 1)}
            />
            <Stat
              label="Référence"
              value={payout.reference.slice(-7)}
              small
            />
          </div>
        </div>
        <div className="flex md:flex-col items-end gap-3">
          <Badge tone={tone} withDot>
            {label}
          </Badge>
          <div className="text-[11px] text-muted-2 num">
            {formatDateTime(payout.scheduledFor)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div>
      <div className="eyebrow text-muted-2">{label}</div>
      <div
        className={`mt-1 font-semibold text-ink ${small ? "text-[13px]" : "text-[16px]"}`}
      >
        {value}
      </div>
    </div>
  );
}
