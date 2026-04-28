"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Mail, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

// Today-action card on the mobile dashboard. Counts derived from the
// existing finance / comps mocks; the destinations are real routes
// scoped by query string when relevant.

interface ActionRow {
  href: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: "warning" | "violet" | "danger";
}

export function MobileTodayCard() {
  const rows: ActionRow[] = [
    {
      href: "/events/evt_jzb_robbie?tab=refunds",
      icon: <Undo2 size={14} strokeWidth={1.8} />,
      label: "Demandes de remboursement",
      count: 3,
      tone: "warning",
    },
    {
      href: "/events/evt_jzb_robbie?tab=invitations",
      icon: <Mail size={14} strokeWidth={1.8} />,
      label: "Comps presse à approuver",
      count: 2,
      tone: "violet",
    },
    {
      href: "/events/evt_jzb_robbie?tab=analyses",
      icon: <AlertTriangle size={14} strokeWidth={1.8} />,
      label: "Stock Carré Or saturé à 76 %",
      count: 1,
      tone: "danger",
    },
  ];

  return (
    <Card variant="surface" size="md" className="!p-0">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-h3 text-ink">Aujourd&apos;hui</h3>
        <p className="text-meta text-ink-soft mt-1">
          Vos actions du jour, dans l&apos;ordre de priorité.
        </p>
      </div>
      <ul className="divide-y divide-line-soft">
        {rows.map((r) => (
          <li key={r.href + r.label}>
            <Link
              href={r.href}
              className="flex items-center gap-3 px-5 h-14 hover:bg-canvas-2/40 active:bg-canvas-2/60 transition-colors"
            >
              <span
                aria-hidden
                className={
                  "h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0 " +
                  (r.tone === "warning"
                    ? "bg-tint-peach text-warning"
                    : r.tone === "violet"
                      ? "bg-violet-soft text-violet-deep"
                      : "bg-tint-rose text-danger")
                }
              >
                {r.icon}
              </span>
              <span className="flex-1 text-[13.5px] text-ink leading-snug">
                {r.label}
              </span>
              <span
                className={
                  "inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-[11px] font-bold num " +
                  (r.tone === "warning"
                    ? "bg-tint-peach text-warning"
                    : r.tone === "violet"
                      ? "bg-violet-soft text-violet-deep"
                      : "bg-tint-rose text-danger")
                }
              >
                {r.count}
              </span>
              <ChevronRight
                size={14}
                strokeWidth={1.8}
                className="text-ink-mute"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
