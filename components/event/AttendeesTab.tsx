"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { attendees as allAttendees } from "@/lib/mockData";
import { formatDate, formatRelative } from "@/lib/format";
import { IconDownload } from "@/components/layout/icons";

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
      <div className="p-6 border-b border-line">
        <CardHeader
          title="Liste des participants"
          subtitle={`${allAttendees.length} acheteurs au total`}
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
            placeholder="Rechercher (nom, email, téléphone)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-11 px-3 bg-surface border border-line text-sm focus:outline-none focus:border-ink"
          >
            <option value="all">Tous les tarifs</option>
            <option value="t_eb">Early Bird</option>
            <option value="t_gen">General</option>
            <option value="t_vip">VIP Lounge</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-3 bg-surface border border-line text-sm focus:outline-none focus:border-ink"
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
          <thead className="text-xs uppercase tracking-badge text-muted text-left border-b border-line">
            <tr>
              <th className="px-6 py-3">Nom</th>
              <th className="px-6 py-3">Téléphone</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Tarif</th>
              <th className="px-6 py-3">Achat</th>
              <th className="px-6 py-3">Statut QR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="border-b border-line/60 hover:bg-bg/40 cursor-pointer"
              >
                <td className="px-6 py-3 text-ink">
                  {a.name}
                  {a.transferredTo ? (
                    <div className="text-xs text-muted mt-0.5">
                      Acheté par {a.originalBuyer} → transféré
                    </div>
                  ) : null}
                </td>
                <td className="px-6 py-3 text-muted num">{a.phone}</td>
                <td className="px-6 py-3 text-muted">{a.email}</td>
                <td className="px-6 py-3 text-ink">{a.tierName}</td>
                <td className="px-6 py-3 text-muted num">
                  {formatDate(a.purchaseDate)}
                </td>
                <td className="px-6 py-3">
                  {a.qrStatus === "unused" ? (
                    <Badge tone="info">À SCANNER</Badge>
                  ) : a.qrStatus === "scanned" ? (
                    <span className="text-xs text-success">
                      Scanné · {formatRelative(a.scannedAt!)}
                    </span>
                  ) : (
                    <Badge tone="warning">TRANSFÉRÉ</Badge>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-muted"
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
