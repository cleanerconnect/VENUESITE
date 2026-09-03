"use client";

import { useState } from "react";
import { CalendarPlus, Star, Users } from "lucide-react";
import { Card, type CardVariant } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog } from "@/components/ui/Dialog";
import { SideSheet } from "@/components/ui/SideSheet";
import { Tabs } from "@/components/ui/Tabs";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricTile } from "@/components/ui/MetricTile";
import { StatTile } from "@/components/cards/StatTile";
import { Sparkline } from "@/components/cards/Sparkline";
import { CapacityRing } from "@/components/cards/CapacityRing";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { LivePulse } from "@/components/motion/LivePulse";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { CHART, seriesColor } from "@/lib/charts/theme";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  ChartSkeleton,
  EntityListSkeleton,
  FormSkeleton,
  KpiGridSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/Skeleton";
import { Row, Specimen } from "../Shell";

const CARD_VARIANTS: CardVariant[] = [
  "surface",
  "canvas-2",
  "sand",
  "sky",
  "sage",
  "rose",
  "peach",
  "gold-soft",
  "violet-soft",
  "ink",
];

const PILL_TONES = [
  "live",
  "pending",
  "draft",
  "past",
  "rejected",
  "info",
  "violet",
  "success",
  "warning",
  "danger",
  "neutral",
] as const;

const FILTERS = [
  { id: "all", label: "Tous", count: 24 },
  { id: "requested", label: "À confirmer", count: 3 },
  { id: "arrived", label: "Arrivés", count: 11 },
] as const;

export function SurfacesSection() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  return (
    <>
      <Specimen name="Card" note="dix variantes, quatre tailles">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {CARD_VARIANTS.map((v) => (
            <Card key={v} variant={v} size="sm">
              <span
                className={`text-meta font-semibold ${
                  v === "ink" ? "text-canvas" : "text-ink"
                }`}
              >
                {v}
              </span>
            </Card>
          ))}
        </div>
        <div className="mt-4">
          <Card variant="ink" size="hero" glow>
            <span className="text-canvas text-h3">ink · hero · glow</span>
          </Card>
        </div>
      </Specimen>

      <Specimen name="Pill" note="onze tons, avec ou sans point">
        <div className="space-y-3">
          <Row>
            {PILL_TONES.map((t) => (
              <Pill key={t} tone={t}>
                {t}
              </Pill>
            ))}
          </Row>
          <Row>
            {PILL_TONES.slice(0, 5).map((t) => (
              <Pill key={t} tone={t} dot>
                {t}
              </Pill>
            ))}
          </Row>
        </div>
      </Specimen>

      <Specimen name="PageHeader">
        <div className="space-y-6">
          <PageHeader title="Versements" subtitle="L'argent de vos billets, sur votre compte." />
          <PageHeader
            eyebrow="Édition"
            title="Jazzablanca 2026"
            badge={<Pill tone="live">En vente</Pill>}
            subtitle="Avec eyebrow, badge et action."
            action={<Button>Publier</Button>}
          />
        </div>
      </Specimen>

      <Specimen name="MetricTile / StatTile" note="un seul cadre, deux portes d'entrée">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatTile
            label="Couverts ce soir"
            value={128}
            delta={{ value: 0.12, period: "vs hier" }}
            icon={<Users size={16} strokeWidth={1.8} className="text-ink-soft" />}
          />
          <StatTile
            variant="sage"
            label="Note moyenne"
            value={4.6}
            hint="Sur 214 avis"
            icon={<Star size={16} strokeWidth={1.8} className="text-ink-soft" />}
          />
          <MetricTile
            variant="rose"
            label="Absences"
            value={<span className="text-metric-lg num">6</span>}
            meta={<span className="text-meta text-danger font-semibold">+2 vs semaine dernière</span>}
            footer={<ProgressBar value={6} max={20} tone="violet" size="sm" />}
          />
        </div>
      </Specimen>

      <Specimen name="ProgressBar">
        <div className="space-y-4 max-w-sm">
          <ProgressBar value={20} max={100} size="xs" />
          <ProgressBar value={55} max={100} size="sm" />
          <ProgressBar value={92} max={100} size="md" />
        </div>
      </Specimen>

      <Specimen name="Tabs" note="possède ses panneaux">
        <Tabs
          tabs={[
            { id: "a", label: "Aperçu", count: 3, content: <p className="text-body text-ink-soft">Contenu de l&apos;onglet A.</p> },
            { id: "b", label: "Détail", content: <p className="text-body text-ink-soft">Contenu de l&apos;onglet B.</p> },
          ]}
        />
      </Specimen>

      <Specimen name="FilterTabs" note="contrôlé, ne rend aucun contenu">
        <FilterTabs
          layoutId="styleguide-filter"
          value={filter}
          onChange={setFilter}
          tabs={FILTERS}
        />
      </Specimen>

      <Specimen name="EmptyState">
        <EmptyState
          title="Aucune réservation pour ce service"
          description="Les demandes arrivent en général deux heures avant l'ouverture."
          cta={{ label: "Ouvrir un créneau" }}
        />
      </Specimen>

      <Specimen name="Dialog / SideSheet / Toast" note="cliquez pour ouvrir">
        <Row>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Dialog
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            SideSheet
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                tone: "success",
                title: "Arrivée enregistrée",
                undo: () => {},
              })
            }
          >
            Toast (avec annuler)
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ tone: "danger", title: "Réservation annulée" })}
          >
            Toast (danger)
          </Button>
        </Row>

        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Refuser la demande ?"
          description="Le client est prévenu immédiatement."
        >
          <p className="text-body text-ink-soft">Corps du dialogue.</p>
        </Dialog>

        <SideSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Salma Bennani"
          description="4 couverts · 20 h 30"
          headerExtra={
            <div className="flex gap-2 mt-3">
              <Pill tone="live" dot>
                Confirmée
              </Pill>
              <Pill tone="violet">Habituée</Pill>
            </div>
          }
          footer={<Button fullWidth>Marquer comme arrivée</Button>}
        >
          <p className="text-body text-ink-soft">
            Panneau latéral sur desktop, feuille par le bas sur téléphone.
          </p>
        </SideSheet>
      </Specimen>

      <Specimen
        name="MetricTile · lanes"
        note="une tuile déclare sa propre voie — desktop, mobile, ou les deux"
      >
        <p className="text-body text-ink-soft">
          Le bento filtre sur <code className="text-[12px]">surface</code>,
          pas sur l&apos;identité d&apos;une tuile. La voie téléphone laisse
          donc tomber ce qui se déclare desktop-only, sans savoir de quelle
          tuile il s&apos;agit. Voir <code className="text-[12px]">kpi-grid</code>
          dans « Blocs d&apos;écran ».
        </p>
      </Specimen>

      <Specimen
        name="Mouvement et chiffres"
        note="AnimatedNumber, LivePulse, Stagger, CapacityRing, Sparkline"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div>
              <code className="text-[11px] text-ink-mute">AnimatedNumber</code>
              <div className="text-metric-lg text-ink num mt-1">
                <AnimatedNumber value={63400} />
              </div>
            </div>
            <div>
              <code className="text-[11px] text-ink-mute">LivePulse</code>
              <div className="mt-1">
                <LivePulse label="LIVE" />
              </div>
            </div>
            <div>
              <code className="text-[11px] text-ink-mute">Sparkline</code>
              <div className="mt-1">
                <Sparkline data={[12, 18, 24, 30, 22, 34, 40, 36]} />
              </div>
            </div>
          </div>
          <div>
            <code className="text-[11px] text-ink-mute">CapacityRing</code>
            <div className="mt-2 flex justify-center">
              <CapacityRing
                progress={0.72}
                topLabel="Arrivés"
                centerLabel="72 %"
                bottomLabel="86 / 120"
              />
            </div>
          </div>
        </div>
      </Specimen>

      <Specimen
        name="ChartTooltip"
        note="une seule infobulle pour les six graphiques"
      >
        <div className="flex flex-wrap gap-4">
          <ChartTooltip
            heading="12 JUIN 2026"
            rows={[{ value: "63 400 MAD" }]}
          />
          <ChartTooltip
            heading="Jour 14"
            rows={[
              { label: "Réel", value: "62,4 %", color: seriesColor(0) },
              { label: "Projection", value: "58,1 %", color: CHART.projection },
            ]}
          />
        </div>
      </Specimen>

      <Specimen name="Skeleton" note="chargement — calqué sur la forme réelle">
        <div className="space-y-6">
          <PageHeaderSkeleton />
          <KpiGridSkeleton count={4} />
          <EntityListSkeleton rows={3} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartSkeleton height={160} />
            <FormSkeleton fields={3} />
          </div>
        </div>
      </Specimen>

      <Specimen name="Icône de section" note="pastille 36px, fond translucide">
        <Row>
          <span className="h-9 w-9 rounded-[12px] flex items-center justify-center bg-violet-soft">
            <CalendarPlus size={16} strokeWidth={1.8} className="text-violet-deep" />
          </span>
        </Row>
      </Specimen>
    </>
  );
}
