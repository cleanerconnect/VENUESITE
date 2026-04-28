import Link from "next/link";
import { ChevronRight, Download, MoreHorizontal, Plus, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LivePulse } from "@/components/motion/LivePulse";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  BOOST_LABEL,
  BoostFormatIcon,
} from "@/components/visibility/BoostFormatIcon";
import { BoostWizardLauncher } from "@/components/visibility/BoostWizard";
import { CampaignStatusPill } from "@/components/visibility/CampaignStatusPill";
import {
  getAudienceSegments,
  getCampaignHistory,
  getCampaigns,
  getPortfolioStats,
} from "@/lib/mock/visibility";
import { formatDateFR, formatMAD } from "@/lib/utils/format";

export default function VisibilitePage() {
  const stats = getPortfolioStats();
  const campaigns = getCampaigns();
  const segments = getAudienceSegments();
  const history = getCampaignHistory();

  return (
    <Stagger className="space-y-6 md:space-y-7">
      {/* === Header === */}
      <StaggerItem>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-h1 text-ink">Visibilité</h1>
            <p className="text-body text-ink-soft mt-1.5 max-w-xl">
              Vos campagnes de mise en avant, à travers tous vos événements.
              Le ROAS est la métrique qui compte.
            </p>
          </div>
          <BoostWizardLauncher className="inline-flex items-center justify-center gap-2 h-11 px-5 text-[14px] rounded-[var(--radius-sm)] font-semibold bg-violet text-canvas hover:bg-violet-deep transition-colors">
            <Plus size={16} strokeWidth={2} />
            Lancer un boost
          </BoostWizardLauncher>
        </div>
      </StaggerItem>

      {/* === Hero strip, three numbers, ROAS is the headline === */}
      <StaggerItem>
        <Card variant="ink" size="hero" glow>
          <div className="grid sm:grid-cols-3 gap-x-8 gap-y-6">
            <PortfolioStat
              label="Dépense ce mois"
              value={formatMAD(stats.monthlySpendMad)}
              tone="neutral"
            />
            <PortfolioStat
              label="Revenu attribué aux boosts"
              value={formatMAD(stats.monthlyRevenueAttributedMad)}
              tone="neutral"
            />
            <PortfolioStat
              label="ROAS portfolio"
              value={
                <>
                  {stats.portfolioRoas.toFixed(1).replace(".", ",")}
                  <span className="text-canvas/60 text-h2 font-bold ml-1">×</span>
                </>
              }
              tone="violet"
              subtitle="ROAS moyen pondéré"
            />
          </div>
        </Card>
      </StaggerItem>

      {/* === Active campaigns === */}
      <StaggerItem>
        <Card variant="surface" size="md" className="!p-0">
          <div className="px-6 pt-6 pb-4 flex items-end justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-h3 text-ink">Campagnes actives</h2>
              <p className="text-meta text-ink-soft mt-1">
                {campaigns.filter((c) => c.status === "active").length} en
                cours · cliquer pour les détails
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LivePulse label="LIVE" />
            </div>
          </div>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-eyebrow text-ink-mute text-left border-y border-line-soft">
                  <th className="px-6 py-3 font-semibold">Campagne</th>
                  <th className="px-6 py-3 font-semibold">Format</th>
                  <th className="px-6 py-3 font-semibold text-right">Audience</th>
                  <th className="px-6 py-3 font-semibold text-right">Restant</th>
                  <th className="px-6 py-3 font-semibold text-right">Dépensé</th>
                  <th className="px-6 py-3 font-semibold text-right">Billets</th>
                  <th className="px-6 py-3 font-semibold text-right">ROAS</th>
                  <th className="px-6 py-3 font-semibold">Statut</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const burnPct = c.spentMad / Math.max(1, c.budgetMad);
                  const roasUnder = c.roas < 3;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-line-soft last:border-0 hover:bg-canvas/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/visibilite/${c.id}`}
                          className="font-semibold text-ink hover:text-violet-deep transition-colors"
                        >
                          {c.name}
                        </Link>
                        <div className="text-meta text-ink-mute mt-0.5">
                          {c.eventName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-ink-soft">
                          <BoostFormatIcon
                            type={c.boostType}
                            className="text-violet-deep"
                          />
                          {BOOST_LABEL[c.boostType]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right num text-ink-soft">
                        {c.uniqueReach.toLocaleString("fr-FR").replace(/,/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-right num text-ink-soft">
                        {c.daysRemaining > 0
                          ? `${c.daysRemaining} ${c.daysRemaining > 1 ? "jours" : "jour"}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="num font-bold text-ink">
                          {formatMAD(c.spentMad)}
                        </div>
                        <div className="mt-1.5 w-[120px] ml-auto">
                          <ProgressBar
                            value={c.spentMad}
                            max={c.budgetMad}
                            tone="violet"
                            size="xs"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right num font-bold text-ink">
                        {c.ticketsAttributed}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`num font-bold ${
                            roasUnder ? "text-warning" : "text-success"
                          }`}
                        >
                          {c.roas.toFixed(1).replace(".", ",")}×
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <CampaignStatusPill status={c.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          aria-label="Actions"
                          className="h-8 w-8 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute"
                        >
                          <MoreHorizontal size={14} strokeWidth={1.8} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </StaggerItem>

      {/* === Saved audiences === */}
      <StaggerItem>
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-h2 text-ink">Audiences sauvegardées</h2>
              <p className="text-body text-ink-soft mt-1">
                Réutilisables sur n'importe quelle campagne, en un clic.
              </p>
            </div>
            <button className="text-meta font-semibold text-ink-soft hover:text-ink transition-colors">
              + Nouvelle audience
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {segments.map((s) => (
              <Card key={s.id} variant="surface" size="md">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="h-9 w-9 rounded-[12px] bg-violet-soft flex items-center justify-center shrink-0"
                  >
                    <Users
                      size={16}
                      strokeWidth={1.7}
                      className="text-violet-deep"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-ink truncate">
                      {s.name}
                    </div>
                    <div className="text-meta text-ink-mute num mt-0.5">
                      {s.memberCount.toLocaleString("fr-FR").replace(/,/g, " ")} utilisateurs
                    </div>
                  </div>
                </div>
                <p className="text-meta text-ink-soft mt-3 leading-relaxed">
                  {s.description}
                </p>
                <BoostWizardLauncher
                  initialSegmentId={s.id}
                  className="mt-4 text-meta font-bold uppercase tracking-[0.08em] text-violet-deep hover:text-ink transition-colors flex items-center gap-1"
                >
                  Lancer un boost
                  <ChevronRight size={12} strokeWidth={2} />
                </BoostWizardLauncher>
              </Card>
            ))}
          </div>
        </section>
      </StaggerItem>

      {/* === History === */}
      <StaggerItem>
        <Card variant="canvas-2" size="md" className="!p-0">
          <div className="px-6 pt-6 pb-4 flex items-end justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-h3 text-ink">Historique des campagnes</h2>
              <p className="text-meta text-ink-soft mt-1">
                {history.length} campagnes terminées
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download size={14} strokeWidth={1.8} />}
            >
              Exporter CSV
            </Button>
          </div>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-eyebrow text-ink-mute text-left border-y border-line-soft">
                  <th className="px-6 py-3 font-semibold">Campagne</th>
                  <th className="px-6 py-3 font-semibold">Événement</th>
                  <th className="px-6 py-3 font-semibold">Terminée</th>
                  <th className="px-6 py-3 font-semibold text-right">Dépense</th>
                  <th className="px-6 py-3 font-semibold text-right">Billets</th>
                  <th className="px-6 py-3 font-semibold text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b border-line-soft last:border-0 hover:bg-canvas/40 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-ink font-medium">
                      {h.name}
                    </td>
                    <td className="px-6 py-3.5 text-ink-soft">
                      {h.eventName}
                    </td>
                    <td className="px-6 py-3.5 text-ink-soft num">
                      {formatDateFR(h.finishedAt)}
                    </td>
                    <td className="px-6 py-3.5 text-right num text-ink">
                      {formatMAD(h.spentMad)}
                    </td>
                    <td className="px-6 py-3.5 text-right num text-ink">
                      {h.ticketsAttributed}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={`num font-bold ${
                          h.finalRoas >= 3 ? "text-success" : "text-warning"
                        }`}
                      >
                        {h.finalRoas.toFixed(1).replace(".", ",")}×
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </StaggerItem>
    </Stagger>
  );
}

function PortfolioStat({
  label,
  value,
  tone,
  subtitle,
}: {
  label: string;
  value: React.ReactNode;
  tone: "neutral" | "violet";
  subtitle?: string;
}) {
  return (
    <div>
      <div className="text-eyebrow text-canvas/55">{label}</div>
      <div
        className={`mt-3 num ${tone === "violet" ? "text-violet" : "text-canvas"}`}
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 600,
          fontSize: "clamp(36px, 5vw, 56px)",
          lineHeight: 1,
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </div>
      {subtitle ? (
        <div className="text-meta text-canvas/55 mt-2">{subtitle}</div>
      ) : null}
    </div>
  );
}
