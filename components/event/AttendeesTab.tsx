"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { attendees as allAttendees } from "@/lib/mockData";
import { formatDate, formatRelative } from "@/lib/format";
import { IconDownload, IconSearch } from "@/components/layout/icons";

export function AttendeesTab() {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = allAttendees.filter((a) => {
    if (
      query &&
      !`${a.name} ${a.email} ${a.phone}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
      return false;
    if (tierFilter !== "all" && a.tierId !== tierFilter) return false;
    if (statusFilter !== "all" && a.qrStatus !== statusFilter) return false;
    return true;
  });

  return (
    <Card padded={false}>
      <div className="px-6 pt-6 pb-5 border-b border-line">
        <CardHeader
          title="Liste des participants"
          subtitle={`${allAttendees.length} acheteurs au total · ${filtered.length} affichés`}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                Envoyer un message
              </Button>
              <Button variant="secondary" size="sm" iconLeft={<IconDownload />}>
                CSV
              </Button>
            </div>
          }
        />
        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            placeholder="Nom, email ou téléphone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            prefix={<IconSearch />}
          />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-11 px-3 bg-surface border border-line rounded-md text-sm focus:outline-none focus:border-ink focus:shadow-focus transition-all"
          >
            <option value="all">Tous les tarifs</option>
            <option value="t_eb">Early Bird</option>
            <option value="t_gen">General</option>
            <option value="t_vip">VIP Lounge</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-3 bg-surface border border-line rounded-md text-sm focus:outline-none focus:border-ink focus:shadow-focus transition-all"
          >
            <option value="all">Tous les statuts QR</option>
            <option value="unused">Non scanné</option>
            <option value="scanned">Scanné</option>
            <option value="transferred">Transféré</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-badge text-muted-2 text-left border-b border-line">
              <th className="px-6 py-3 font-semibold">Nom</th>
              <th className="px-6 py-3 font-semibold">Téléphone</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">Tarif</th>
              <th className="px-6 py-3 font-semibold">Achat</th>
              <th className="px-6 py-3 font-semibold">Statut QR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="border-b border-line/60 hover:bg-bg-soft/50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-3.5 text-ink">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-ink/[0.06] to-ink/[0.12] text-ink text-[10px] flex items-center justify-center font-semibold">
                      {a.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{a.name}</div>
                      {a.transferredTo ? (
                        <div className="text-[11px] text-muted mt-0.5">
                          {a.originalBuyer} → transféré
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-muted num">{a.phone}</td>
                <td className="px-6 py-3.5 text-muted">{a.email}</td>
                <td className="px-6 py-3.5">
                  <span className="chip">{a.tierName}</span>
                </td>
                <td className="px-6 py-3.5 text-muted num">
                  {formatDate(a.purchaseDate)}
                </td>
                <td className="px-6 py-3.5">
                  {a.qrStatus === "unused" ? (
                    <Badge tone="info" withDot>
                      À SCANNER
                    </Badge>
                  ) : a.qrStatus === "scanned" ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-success font-medium">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="m3 6.5 2 2 4-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Scanné · {formatRelative(a.scannedAt!)}
                    </span>
                  ) : (
                    <Badge tone="purple" withDot />
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-muted"
                >
                  Aucun participant ne correspond à ces filtres.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
