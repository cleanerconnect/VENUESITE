"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Check,
  ChevronDown,
  Circle,
  Clock,
  Filter,
  Gift,
  MapPin,
  Megaphone,
  Printer,
  ScanLine,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  TicketCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { LivePulse } from "@/components/motion/LivePulse";
import { useToast } from "@/components/ui/Toast";
import { getRegieByEventId } from "@/lib/data/static/regie";
import { formatRelativeFR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { LyfeEvent } from "@/lib/types/domain";
import type {
  ChecklistItem,
  Gate,
  LiveOpsEntry,
  RegieAnomaly,
  RegieMode,
  WillCallAttendee,
} from "@/lib/types/regie";

const STATUS_TONE = {
  complete: "success",
  in_progress: "violet",
  pending: "neutral",
} as const;
const STATUS_LABEL = {
  complete: "Validé",
  in_progress: "En cours",
  pending: "À faire",
} as const;

const GATE_TONE: Record<Gate["status"], "success" | "warning" | "neutral"> = {
  normal: "success",
  alert: "warning",
  offline: "neutral",
};
const GATE_LABEL: Record<Gate["status"], string> = {
  normal: "Nominal",
  alert: "Alerte",
  offline: "Hors-ligne",
};

const OPS_ICON = {
  scan_milestone: <ScanLine size={13} strokeWidth={1.8} />,
  walk_up_sale: <ShoppingBag size={13} strokeWidth={1.8} />,
  comp_issued: <Gift size={13} strokeWidth={1.8} />,
  staff_change: <Users size={13} strokeWidth={1.8} />,
  anomaly_raised: <AlertTriangle size={13} strokeWidth={1.8} />,
  anomaly_resolved: <Check size={13} strokeWidth={1.8} />,
} as const;

const OPS_COLOR = {
  scan_milestone: "var(--color-success)",
  walk_up_sale: "var(--color-violet-deep)",
  comp_issued: "var(--color-violet)",
  staff_change: "var(--color-info)",
  anomaly_raised: "var(--color-warning)",
  anomaly_resolved: "var(--color-success)",
} as const;

export function RegieTab({ event }: { event: LyfeEvent }) {
  const data = getRegieByEventId(event.id);
  const [mode, setMode] = useState<RegieMode>(data?.defaultMode ?? "pre_event");

  if (!data) {
    return (
      <Card variant="surface" size="md">
        <p className="text-body text-ink-soft">
          La régie est disponible dès l&apos;ouverture de la billetterie.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <ModeToggle mode={mode} onChange={setMode} isReplay={event.status.state === "past" || event.status.state === "settled"} />

      {mode === "pre_event" ? (
        <PreEventView data={data} />
      ) : (
        <LiveView data={data} isReplay={event.status.state === "past" || event.status.state === "settled"} />
      )}
    </div>
  );
}

// ─── Mode toggle ───────────────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
  isReplay,
}: {
  mode: RegieMode;
  onChange: (next: RegieMode) => void;
  isReplay: boolean;
}) {
  return (
    <div className="inline-flex items-center bg-canvas-2 border border-line-soft rounded-full p-1">
      <ToggleButton active={mode === "pre_event"} onClick={() => onChange("pre_event")}>
        Avant événement
      </ToggleButton>
      <ToggleButton active={mode === "live"} onClick={() => onChange("live")}>
        {isReplay ? (
          "Jour J · Replay"
        ) : (
          <span className="inline-flex items-center gap-1.5">
            Jour J · Live
            <LivePulse />
          </span>
        )}
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-4 rounded-full text-[12.5px] font-semibold transition-colors",
        active
          ? "bg-surface text-ink shadow-soft"
          : "text-ink-mute hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

// ─── Pre-event view ────────────────────────────────────────────────────

function PreEventView({
  data,
}: {
  data: ReturnType<typeof getRegieByEventId> & object;
}) {
  return (
    <div className="space-y-5">
      <ChecklistCard checklist={data.checklist} />
      <WillCallSearch attendees={data.willCallSample} />
    </div>
  );
}

function ChecklistCard({ checklist }: { checklist: ChecklistItem[] }) {
  const completedCount = checklist.filter((c) => c.status === "complete").length;
  return (
    <Card variant="surface" size="md" className="!p-0">
      <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3 flex-wrap border-b border-line-soft">
        <div>
          <h3 className="text-h3 text-ink">Checklist pré-événement</h3>
          <p className="text-meta text-ink-soft mt-1">
            {completedCount} / {checklist.length} étapes validées · à boucler
            avant J-2
          </p>
        </div>
        <div className="text-meta text-ink-soft num">
          <span className="font-bold text-ink">{completedCount}</span>
          <span className="text-ink-mute"> / {checklist.length}</span>
        </div>
      </div>
      <Accordion.Root type="multiple" className="divide-y divide-line-soft">
        {checklist.map((item) => (
          <Accordion.Item key={item.id} value={item.id} className="px-6">
            <Accordion.Header>
              <Accordion.Trigger className="group w-full flex items-center gap-4 py-4 outline-none text-left">
                <ChecklistDot status={item.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className="text-[14px] font-semibold text-ink">
                      {item.label}
                    </span>
                    <Pill tone={STATUS_TONE[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Pill>
                  </div>
                  <p className="text-meta text-ink-soft mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={1.8}
                  className="text-ink-mute transition-transform shrink-0 group-data-[state=open]:rotate-180"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=open]:animate-[accordion-open_0.24s_ease-out] data-[state=closed]:animate-[accordion-close_0.20s_ease-in]">
              <div className="pb-4 pl-9">
                {item.details ? (
                  <ul className="space-y-2">
                    {item.details.map((d, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2.5 text-meta"
                      >
                        <ChecklistDot status={d.status} small />
                        <span
                          className={
                            d.status === "complete"
                              ? "text-ink-soft line-through"
                              : "text-ink"
                          }
                        >
                          {d.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Card>
  );
}

function ChecklistDot({
  status,
  small = false,
}: {
  status: ChecklistItem["status"];
  small?: boolean;
}) {
  const size = small ? 12 : 16;
  const wrapClass = small ? "h-4 w-4" : "h-6 w-6";
  if (status === "complete") {
    return (
      <span
        className={cn(
          "rounded-full bg-success text-canvas flex items-center justify-center shrink-0",
          wrapClass,
        )}
        aria-hidden
      >
        <Check size={size - 2} strokeWidth={2.4} />
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span
        className={cn(
          "rounded-full bg-violet-soft text-violet-deep flex items-center justify-center shrink-0",
          wrapClass,
        )}
        aria-hidden
      >
        <Clock size={size - 2} strokeWidth={2} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-full border border-line text-ink-mute flex items-center justify-center shrink-0",
        wrapClass,
      )}
      aria-hidden
    >
      <Circle size={size - 4} strokeWidth={1.8} />
    </span>
  );
}

function WillCallSearch({
  attendees,
}: {
  attendees: WillCallAttendee[];
}) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const matches = query.trim()
    ? attendees.filter((a) =>
        a.fullName.toLowerCase().includes(query.toLowerCase()),
      )
    : [];
  return (
    <Card variant="surface" size="md">
      <div className="mb-4">
        <h3 className="text-h3 text-ink">Will-call · recherche participant</h3>
        <p className="text-meta text-ink-soft mt-1">
          Retrouvez un participant par nom et imprimez son billet en self-service
        </p>
      </div>
      <div className="relative mb-4">
        <Search
          size={14}
          strokeWidth={1.8}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un participant par nom"
          className="w-full h-11 pl-9 pr-4 bg-surface border border-line rounded-full text-[14px] outline-none focus:border-ink transition-colors"
        />
      </div>

      {query.trim() && matches.length === 0 ? (
        <p className="text-meta text-ink-soft py-6 text-center">
          Aucun participant trouvé pour « {query} ».
        </p>
      ) : null}

      {matches.length > 0 ? (
        <ul className="divide-y divide-line-soft border-y border-line-soft -mx-2">
          {matches.slice(0, 8).map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 px-2 py-3"
            >
              <span
                aria-hidden
                className="h-9 w-9 rounded-full bg-violet-soft text-violet-deep font-semibold flex items-center justify-center text-[11px] shrink-0 num"
              >
                {a.initials.split(".")[0].trim()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-ink num">
                  {a.initials} <span className="text-ink-soft">· {a.tierName}</span>
                </div>
                <div className="text-meta text-ink-mute num mt-0.5">
                  {a.amountPaidLabel}
                </div>
              </div>
              <Pill
                tone={
                  a.paymentStatus === "paid"
                    ? "success"
                    : a.paymentStatus === "comp"
                      ? "violet"
                      : "info"
                }
              >
                {a.paymentStatus === "paid"
                  ? "Payé"
                  : a.paymentStatus === "comp"
                    ? "Comp"
                    : "Partenaire"}
              </Pill>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Printer size={12} strokeWidth={1.9} />}
                onClick={() =>
                  toast({
                    tone: "success",
                    title: `Billet ${a.initials} envoyé à l'imprimante will-call`,
                  })
                }
              >
                Imprimer
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {!query.trim() ? (
        <p className="text-meta text-ink-mute py-2">
          Tapez un nom — la recherche couvre tous les participants payants,
          comps et partenaires.
        </p>
      ) : null}
    </Card>
  );
}

// ─── Live (replay) view ────────────────────────────────────────────────

function LiveView({
  data,
  isReplay,
}: {
  data: ReturnType<typeof getRegieByEventId> & object;
  isReplay: boolean;
}) {
  const { toast } = useToast();
  const allOffline = data.gates.every((g) => g.status === "offline");

  if (allOffline) {
    return (
      <Card variant="surface" size="md" className="text-center py-12">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-soft mb-5"
        >
          <ScanLine size={22} strokeWidth={1.6} className="text-violet-deep" />
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
          La régie live s&apos;ouvre le jour J.
        </h3>
        <p className="text-body text-ink-soft mt-3 max-w-md mx-auto leading-relaxed">
          Tout sera connecté à 19h00 le {data.doorDayLabel}. La cadence
          des scans, l&apos;état des portes, les anomalies et l&apos;ops
          feed s&apos;animeront ici en temps réel.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Live hero */}
      <Card variant="ink" size="md" glow>
        <div className="flex items-baseline gap-3 flex-wrap mb-5">
          <span className="text-eyebrow text-canvas/60 inline-flex items-center gap-1.5">
            {isReplay ? "Replay door-day" : "Cadence live"}
            {!isReplay ? <LivePulse /> : null}
          </span>
          <span className="text-meta text-canvas/55 num">
            · {data.doorDayLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-4">
          <LiveStat
            label="Scans cumulés"
            value={data.totalScanned.toLocaleString("fr-FR").replace(/,/g, " ")}
            sub={`sur ${data.totalSold.toLocaleString("fr-FR").replace(/,/g, " ")} billets`}
          />
          <LiveStat
            label="Taux de scan"
            value={`${data.scanRatePct.toFixed(1).replace(".", ",")} %`}
            sub="cadence cumulée"
            divider
          />
          <LiveStat
            label="Dernière minute"
            value={`${data.scansLastMinute}/min`}
            sub="cadence instantanée"
            divider
          />
          <LiveStat
            label="Capacité atteinte"
            value={`${Math.round((data.totalScanned / data.totalSold) * 100)} %`}
            sub="vs jauge totale"
            divider
          />
        </div>
      </Card>

      {/* Gates grid */}
      <Card variant="surface" size="md">
        <div className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-h3 text-ink">Portes en direct</h3>
            <p className="text-meta text-ink-soft mt-1">
              Cadence, queue estimée, staff actif par gate
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.gates.map((g) => (
            <GateCard key={g.id} gate={g} />
          ))}
        </div>
      </Card>

      {/* Anomalies */}
      {data.anomalies.length > 0 ? (
        <Card variant="surface" size="md">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={1.9} className="text-warning" />
            <span className="text-eyebrow text-warning">Alertes en cours</span>
          </div>
          <ul className="space-y-2">
            {data.anomalies.map((a) => (
              <AnomalyRow key={a.id} anomaly={a} />
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Ad-hoc actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="violet-soft" size="md">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="h-10 w-10 rounded-[12px] bg-canvas/60 flex items-center justify-center shrink-0"
            >
              <Banknote size={18} strokeWidth={1.7} className="text-violet-deep" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-eyebrow text-violet-deep">
                Vente walk-up
              </div>
              <p className="text-meta text-ink-soft mt-1.5 leading-relaxed">
                Encaissez à la porte un visiteur qui n&apos;a pas pré-acheté.
                Saisie tarif, nom, paiement cash ou carte.
              </p>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<UserPlus size={13} strokeWidth={1.8} />}
                  onClick={() =>
                    toast({
                      tone: "success",
                      title: "Formulaire walk-up ouvert",
                      description: "Encaissez puis imprimez le billet en 3 clics.",
                    })
                  }
                >
                  Nouvelle vente walk-up
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="surface" size="md">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="h-10 w-10 rounded-[12px] bg-tint-sage flex items-center justify-center shrink-0"
            >
              <Gift size={18} strokeWidth={1.7} className="text-success" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-eyebrow text-success">
                Comp door-day
              </div>
              <p className="text-meta text-ink-soft mt-1.5 leading-relaxed">
                Délivrez une invitation gracieuse instantanément — nom,
                catégorie, et impression sur place.
              </p>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<Send size={13} strokeWidth={1.8} />}
                  onClick={() =>
                    toast({
                      tone: "success",
                      title: "Comp door-day émis",
                      description: "Le billet est prêt à imprimer.",
                    })
                  }
                >
                  Émettre un comp
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Live ops feed */}
      <Card variant="surface" size="md">
        <div className="mb-4">
          <h3 className="text-h3 text-ink">Journal opérationnel</h3>
          <p className="text-meta text-ink-soft mt-1">
            Moments clés du door-day · le plus récent en haut
          </p>
        </div>
        <ul className="space-y-1 -mx-2">
          {[...data.liveOpsFeed]
            .sort((a, b) => (a.at < b.at ? 1 : -1))
            .map((entry) => (
              <OpsRow key={entry.id} entry={entry} />
            ))}
        </ul>
      </Card>
    </div>
  );
}

function LiveStat({
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
    <div className={divider ? "md:border-l md:border-canvas/15 md:pl-4" : ""}>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-canvas/55">
        {label}
      </div>
      <div className="text-h2 text-canvas num mt-1.5">{value}</div>
      <div className="text-meta text-canvas/55 num mt-0.5">{sub}</div>
    </div>
  );
}

function GateCard({ gate }: { gate: Gate }) {
  const fillPct = Math.min(100, (gate.totalScanned / gate.capacity) * 100);
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] p-4 border bg-surface relative overflow-hidden",
        gate.status === "alert"
          ? "border-warning/40 bg-tint-peach/40"
          : "border-line-soft",
      )}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-[13px] font-semibold text-ink inline-flex items-center gap-1">
          <MapPin size={11} strokeWidth={1.9} className="text-ink-mute" />
          {gate.name}
        </span>
        <Pill tone={GATE_TONE[gate.status]}>{GATE_LABEL[gate.status]}</Pill>
      </div>
      <div
        className="text-violet-deep num"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "22px",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {gate.scansPerMin}
        <span className="text-ink-mute text-[13px] font-normal ml-1">/min</span>
      </div>
      <div className="mt-3 h-1 rounded-full bg-canvas-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-violet"
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2 text-meta num">
        <div>
          <div className="text-ink-mute">Scans</div>
          <div className="font-bold text-ink">{gate.totalScanned}</div>
        </div>
        <div>
          <div className="text-ink-mute">Queue</div>
          <div className="font-bold text-ink">{gate.queueMin} min</div>
        </div>
        <div>
          <div className="text-ink-mute">Staff</div>
          <div className="font-bold text-ink">{gate.staffActive}</div>
        </div>
      </div>
    </div>
  );
}

function AnomalyRow({ anomaly }: { anomaly: RegieAnomaly }) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 border-l-2",
        anomaly.severity === "critical"
          ? "bg-tint-rose/60 border-danger"
          : "bg-tint-peach/60 border-warning",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          anomaly.severity === "critical"
            ? "bg-danger/15 text-danger"
            : "bg-warning/15 text-warning",
        )}
      >
        <AlertTriangle size={13} strokeWidth={1.9} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink leading-snug">
          <span className="font-semibold">
            {anomaly.scope ? `${anomaly.scope} · ` : ""}
          </span>
          {anomaly.message}
        </div>
        <div className="text-meta text-ink-mute mt-0.5">
          {formatRelativeFR(anomaly.at)}
        </div>
      </div>
    </li>
  );
}

function OpsRow({ entry }: { entry: LiveOpsEntry }) {
  const color = OPS_COLOR[entry.type];
  return (
    <li className="flex items-start gap-3 px-2 py-2.5">
      <span
        aria-hidden
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
          color,
        }}
      >
        {OPS_ICON[entry.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink leading-snug">
          {entry.message}
        </div>
        <div className="text-meta text-ink-mute mt-0.5 flex items-center gap-2">
          {formatRelativeFR(entry.at)}
          {entry.actorInitials ? (
            <span className="num">· {entry.actorInitials}</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
