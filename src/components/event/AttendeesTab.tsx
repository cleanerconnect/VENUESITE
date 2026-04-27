"use client";

import { useState } from "react";
import { Download, MessageSquare, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { getAttendees } from "@/lib/mock/events";
import { formatDateFR, formatRelativeFR } from "@/lib/utils/format";

export function AttendeesTab() {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const all = getAttendees();
  const filtered = all.filter((a) => {
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
    <Card variant="surface" size="md" className="!p-0">
      {/* Header + filters */}
      <div className="px-6 pt-6 pb-5 border-b border-line-soft">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="text-h3 text-ink">Liste des participants</h3>
            <p className="text-meta text-ink-soft mt-1">
              {all.length} acheteurs au total · {filtered.length} affichés
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<MessageSquare size={14} strokeWidth={1.8} />}
            >
              Message
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download size={14} strokeWidth={1.8} />}
            >
              CSV
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.8}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, email, téléphone…"
              className="w-full h-10 pl-9 pr-3 bg-canvas-2/60 border border-line rounded-[var(--radius-sm)] text-[13px] outline-none focus:border-ink transition-colors"
            />
          </div>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-10 px-3 bg-canvas-2/60 border border-line rounded-[var(--radius-sm)] text-[13px] focus:outline-none focus:border-ink"
          >
            <option value="all">Tous les tarifs</option>
            <option value="t_eb">Early Bird</option>
            <option value="t_gen">General</option>
            <option value="t_vip">VIP Lounge</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 bg-canvas-2/60 border border-line rounded-[var(--radius-sm)] text-[13px] focus:outline-none focus:border-ink"
          >
            <option value="all">Tous les statuts QR</option>
            <option value="unused">Non scanné</option>
            <option value="scanned">Scanné</option>
            <option value="transferred">Transféré</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-eyebrow text-ink-mute text-left border-b border-line-soft">
              <th className="px-6 py-3 font-semibold">Nom</th>
              <th className="px-6 py-3 font-semibold">Téléphone</th>
              <th className="px-6 py-3 font-semibold">Email</th>
              <th className="px-6 py-3 font-semibold">Tarif</th>
              <th className="px-6 py-3 font-semibold">Acheté</th>
              <th className="px-6 py-3 font-semibold">Statut QR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="border-b border-line-soft last:border-0 hover:bg-canvas/40 cursor-pointer transition-colors"
              >
                <td className="px-6 py-3.5 text-ink">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-ink shrink-0"
                      style={{ background: "var(--color-tint-peach)" }}
                    >
                      {a.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{a.name}</div>
                      {a.transferredTo ? (
                        <div className="text-[11px] text-ink-mute mt-0.5">
                          {a.originalBuyer} → {a.transferredTo}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-ink-soft num">{a.phone}</td>
                <td className="px-6 py-3.5 text-ink-soft">{a.email}</td>
                <td className="px-6 py-3.5">
                  <Pill tone="neutral">{a.tierName}</Pill>
                </td>
                <td className="px-6 py-3.5 text-ink-soft num">
                  {formatDateFR(a.purchaseDate)}
                </td>
                <td className="px-6 py-3.5">
                  {a.qrStatus === "unused" ? (
                    <Pill tone="neutral">Non utilisé</Pill>
                  ) : a.qrStatus === "scanned" ? (
                    <span className="text-[12px] font-semibold text-gold-deep num">
                      Scanné · {formatRelativeFR(a.scannedAt!)}
                    </span>
                  ) : (
                    <Pill tone="info">Transféré</Pill>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-14 text-center text-[13px] text-ink-mute"
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
