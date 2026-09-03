"use client";

import { useState } from "react";
import {
  ChevronDown,
  Lock,
  Mail,
  ScanLine,
  Send,
  Sparkles,
  Ticket,
} from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { IssueCompsDialog } from "./IssueCompsDialog";
import {
  COMP_CATEGORY_LABEL,
  type CompAllocation,
  type CompCategory,
  type CompStatus,
} from "@/lib/types/comps";
import { formatDateTimeFR, formatRelativeFR } from "@/lib/utils/format";
import type { LyfeEvent } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { useEventQuery } from "@/lib/data/useQuery";
import { QueryState } from "@/components/data/QueryState";
import { ChartSkeleton, EntityListSkeleton, KpiGridSkeleton } from "@/components/ui/Skeleton";

const STATUS_LABEL: Record<CompStatus, string> = {
  issued: "Émise",
  delivered: "Envoyée",
  scanned: "Scannée",
  no_show: "Non utilisée",
};

const STATUS_TONE: Record<
  CompStatus,
  "info" | "violet" | "success" | "neutral"
> = {
  issued: "info",
  delivered: "violet",
  scanned: "success",
  no_show: "neutral",
};

const ACTION_LABEL = {
  issued: "Invitation émise",
  redistributed: "Réallocation",
  revoked: "Annulation",
} as const;

export function InvitationsTab({ event }: { event: LyfeEvent }) {
  const query = useEventQuery((repo) => repo.getInvitations(event.id), [event.id]);
  const data = query.data;
  const [issueOpen, setIssueOpen] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState<CompCategory>("press");

  const openIssue = (category: CompCategory) => {
    setDefaultCategory(category);
    setIssueOpen(true);
  };

  // Loading and failure are distinct from "nothing to show" — before the
  // read became async, `!data` covered all three and a slow load looked
  // like an empty tab.
  if (query.status !== "ready") {
    return (
      <QueryState
        query={query}
        label="Chargement"
        skeleton={<div className="space-y-5"><KpiGridSkeleton count={3} /><EntityListSkeleton rows={4} /></div>}
      />
    );
  }

  if (!data || data.totalIssued === 0) {
    return (
      <div className="space-y-5">
        <Card variant="surface" size="md" className="text-center py-12">
          <span
            aria-hidden
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-soft mb-5"
          >
            <Mail size={22} strokeWidth={1.6} className="text-violet-deep" />
          </span>
          <h3
            className="text-ink"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Pas encore d&apos;invitations émises.
          </h3>
          <p className="text-body text-ink-soft mt-3 max-w-md mx-auto leading-relaxed">
            Émettez vos invitations presse, sponsors, talent et personnel
            depuis cette page. Chaque invitation génère un lien unique
            traçable jusqu&apos;au scan.
          </p>
          <div className="mt-6">
            <Button
              size="lg"
              iconLeft={<Send size={16} strokeWidth={1.8} />}
              onClick={() => setIssueOpen(true)}
            >
              Lancer une campagne d&apos;invitations
            </Button>
          </div>
        </Card>

        <Card variant="violet-soft" size="md">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="h-9 w-9 rounded-[10px] bg-canvas/60 flex items-center justify-center shrink-0"
            >
              <Sparkles
                size={16}
                strokeWidth={1.7}
                className="text-violet-deep"
              />
            </span>
            <div className="min-w-0">
              <div className="text-eyebrow text-violet-deep">
                Bonnes pratiques festival
              </div>
              <p className="text-[14px] text-ink mt-2 leading-relaxed">
                Réservez 8-10 % de votre capacité pour les invitations presse,
                sponsors, talent, et personnel. Sur l&apos;édition Jazzablanca
                2025, cette allocation a généré 30 articles presse, sécurisé
                7 partenariats, et permis aux équipes terrain de tester la
                billetterie en conditions réelles.
              </p>
            </div>
          </div>
        </Card>

        <IssueCompsDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          defaultCategory={defaultCategory}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* === Hero strip === */}
      <Card variant="surface" size="md">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-6">
          <HeroStat
            label="Invitations émises"
            value={String(data.totalIssued)}
            sub={`${data.totalAllocation} allouées au total`}
          />
          <HeroStat
            label="Distribuées"
            value={String(data.totalDelivered)}
            sub="Liens envoyés aux destinataires"
            divider
          />
          <HeroStat
            label="Scannées le jour J"
            value={String(data.totalScanned)}
            sub={`${data.scanRatePct.toFixed(1).replace(".", ",")} % de taux de scan`}
            divider
          />
          <HeroStat
            label="Inventaire restant"
            value={String(data.remainingAllocation)}
            sub="Allocation invitations encore disponible"
            divider
          />
        </div>
      </Card>

      {/* === Issue CTA === */}
      <div className="flex items-center justify-end">
        <Button
          size="md"
          iconLeft={<Send size={14} strokeWidth={1.8} />}
          onClick={() => setIssueOpen(true)}
        >
          Émettre une invitation
        </Button>
      </div>

      {/* === Catégories card with expandable allocations === */}
      <Card variant="surface" size="md" className="!p-0">
        <div className="px-6 pt-6 pb-4 border-b border-line-soft">
          <h3 className="text-h3 text-ink">Catégories</h3>
          <p className="text-meta text-ink-soft mt-1">
            Allocations groupées · cliquez pour voir les invités individuels
          </p>
        </div>
        <Accordion.Root type="multiple" className="divide-y divide-line-soft">
          {data.categories.map((cat) => {
            const fillPct =
              cat.allocated > 0 ? (cat.used / cat.allocated) * 100 : 0;
            const allocations = data.allocations.filter(
              (a) => a.category === cat.category,
            );
            const visibleSampleTickets = allocations.reduce(
              (s, a) => s + a.ticketCount,
              0,
            );
            const remaining = cat.used - visibleSampleTickets;
            return (
              <Accordion.Item
                key={cat.category}
                value={cat.category}
                className="px-6"
              >
                <Accordion.Header>
                  <Accordion.Trigger
                    className={cn(
                      "group w-full flex items-center gap-4 py-4 outline-none",
                      "text-left",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <span className="text-[14px] font-semibold text-ink">
                          {cat.label}
                        </span>
                        <span className="text-meta num text-ink-soft">
                          <span className="font-bold text-ink">{cat.used}</span>
                          <span className="text-ink-mute"> / {cat.allocated}</span>
                          <span className="text-ink-mute"> émises · </span>
                          <span className="font-semibold text-success">
                            {cat.redeemed} scannées
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-canvas-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet"
                          style={{ width: `${Math.min(100, fillPct)}%` }}
                        />
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      strokeWidth={1.8}
                      className="text-ink-mute transition-transform shrink-0 group-data-[state=open]:rotate-180"
                    />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=open]:animate-[accordion-open_0.24s_ease-out] data-[state=closed]:animate-[accordion-close_0.20s_ease-in]">
                  <div className="pb-4 space-y-2">
                    <ul className="divide-y divide-line-soft border-y border-line-soft">
                      {allocations.map((a) => (
                        <AllocationRow key={a.id} allocation={a} />
                      ))}
                    </ul>
                    <div className="flex items-center justify-between pt-3">
                      {remaining > 0 ? (
                        <span className="text-meta text-ink-mute">
                          + {remaining} autres places émises sur cette
                          catégorie · {allocations.length} destinataires
                          détaillés ci-dessus
                        </span>
                      ) : (
                        <span className="text-meta text-ink-mute">
                          {allocations.length} destinataires sur cette
                          catégorie
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={<Send size={12} strokeWidth={1.8} />}
                        onClick={() => openIssue(cat.category)}
                      >
                        Émettre dans cette catégorie
                      </Button>
                    </div>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            );
          })}
        </Accordion.Root>
      </Card>

      {/* === Audit trail === */}
      <Card variant="surface" size="md">
        <div className="mb-4">
          <h3 className="text-h3 text-ink">Journal d&apos;émission</h3>
          <p className="text-meta text-ink-soft mt-1">
            Historique chronologique des invitations émises
          </p>
        </div>
        <ul className="divide-y divide-line-soft">
          {data.auditTrail.map((entry) => (
            <li key={entry.id} className="py-2.5 flex items-center gap-3">
              <span
                aria-hidden
                className="h-8 w-8 rounded-full bg-violet-soft text-violet-deep flex items-center justify-center shrink-0"
              >
                <Ticket size={13} strokeWidth={1.8} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-ink leading-snug">
                  <span className="font-semibold">
                    {ACTION_LABEL[entry.action]}
                  </span>{" "}
                  <span className="text-ink-soft">
                    · {entry.ticketCount} place
                    {entry.ticketCount > 1 ? "s" : ""} ·{" "}
                    {COMP_CATEGORY_LABEL[entry.category]} · vers{" "}
                    <span className="font-semibold text-ink">
                      {entry.recipientInitials}
                    </span>
                  </span>
                </div>
                <div className="text-meta text-ink-mute num mt-0.5">
                  Par <span className="font-semibold">{entry.actorInitials}</span>
                  {" · "}
                  {formatRelativeFR(entry.at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-start gap-2 text-meta text-ink-mute leading-relaxed">
          <Lock size={11} strokeWidth={1.9} className="mt-0.5 shrink-0" />
          <p>
            Données affichées en initiales conformément à la déclaration
            CNDP n° A-PO-23/2024. Le nom complet et l&apos;email du
            destinataire restent visibles uniquement à l&apos;équipe
            propriétaire.
          </p>
        </div>
      </Card>

      <IssueCompsDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        defaultCategory={defaultCategory}
      />
    </div>
  );
}

function AllocationRow({ allocation }: { allocation: CompAllocation }) {
  return (
    <li className="py-3 flex items-center gap-3">
      <span
        aria-hidden
        className="h-8 w-8 rounded-full bg-canvas-2 text-ink-soft flex items-center justify-center text-[10px] font-semibold shrink-0 num"
      >
        {allocation.recipientInitials.split(".")[0].trim()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink num">
          <span className="font-semibold">{allocation.recipientInitials}</span>
          <span className="text-ink-soft"> · {allocation.organization}</span>
        </div>
        <div className="text-meta text-ink-mute num mt-0.5 flex items-center gap-2 flex-wrap">
          <span>
            {allocation.ticketCount} place{allocation.ticketCount > 1 ? "s" : ""}
          </span>
          <span>·</span>
          <span>Émise par {allocation.issuedByInitials}</span>
          <span>·</span>
          <span>{formatDateTimeFR(allocation.issuedAt)}</span>
        </div>
      </div>
      <Pill tone={STATUS_TONE[allocation.status]}>
        {allocation.status === "scanned" ? (
          <>
            <ScanLine size={11} strokeWidth={2} className="-ml-0.5" />
            {STATUS_LABEL[allocation.status]}
          </>
        ) : (
          STATUS_LABEL[allocation.status]
        )}
      </Pill>
    </li>
  );
}

function HeroStat({
  label,
  value,
  sub,
  divider = false,
}: {
  label: string;
  value: string;
  sub: string;
  divider?: boolean;
}) {
  return (
    <div className={divider ? "md:border-l md:border-line-soft md:pl-6" : ""}>
      <div className="text-eyebrow text-ink-mute">{label}</div>
      <div
        className="text-violet-deep num mt-2"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(28px, 4vw, 36px)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div className="text-meta text-ink-soft mt-2 leading-snug">{sub}</div>
    </div>
  );
}
