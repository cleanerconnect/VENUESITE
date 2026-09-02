"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MetricTile } from "@/components/ui/MetricTile";
import { Sparkline } from "@/components/cards/Sparkline";
import type { KpiGridBlock as Spec, KpiTile } from "@/lib/dashboard/spec";
import {
  DeltaChip,
  Icon,
  MetricValue,
  SpecBadge,
  cardVariant,
} from "../primitives";
import { useCommandRunner } from "../commands";
import { cn } from "@/lib/utils/cn";

// Declared count is the widest case; narrower viewports step down. A
// one-column grid is the phone lane's vertical card stack.
const COLUMNS: Record<1 | 2 | 3 | 4, string> = {
  1: "",
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
};

// The bento. Tile order, surface tints and column spans all arrive as
// data — which is what makes the sand → white → white → sage rhythm from
// the direction review a *composition* decision rather than a code one.
export function KpiGridBlock({
  block,
  surface = "desktop",
}: {
  block: Spec;
  surface?: "desktop" | "mobile";
}) {
  // A tile declares its own lane, the same way a block does. The phone
  // lane therefore never has to know that "the payout tile" is the one
  // it drops — it drops whatever says it is desktop-only.
  const tiles = block.tiles.filter(
    (t) => !t.surface || t.surface === "both" || t.surface === surface,
  );

  return (
    <div className={cn("grid grid-cols-1 gap-4", COLUMNS[block.columns ?? 4])}>
      {tiles.map((tile) => (
        <Tile key={tile.id} tile={tile} />
      ))}
    </div>
  );
}

function Tile({ tile }: { tile: KpiTile }) {
  const run = useCommandRunner();

  const body = (
    <MetricTile
      variant={cardVariant(tile.tone)}
      span={tile.span}
      label={tile.label}
      icon={
        tile.icon ? (
          <Icon name={tile.icon} size={16} className="text-ink-soft" />
        ) : null
      }
      value={<MetricValue metric={tile.metric} />}
      meta={
        tile.delta ? (
          <DeltaChip delta={tile.delta} />
        ) : tile.hint ? (
          <span className="text-meta text-ink-soft">{tile.hint}</span>
        ) : null
      }
      footer={
        tile.chips?.length || tile.sparkline?.length ? (
          <div className="space-y-4">
            {tile.chips?.length ? (
              <div className="flex items-center gap-2 flex-wrap">
                {tile.chips.map((chip, i) => (
                  <SpecBadge key={`${chip.label}-${i}`} badge={chip} />
                ))}
              </div>
            ) : null}
            {tile.sparkline?.length ? (
              <div className="flex items-end justify-between gap-3">
                {/* The hint moves down here once a delta has taken the
                    meta line, so a tile never shows two stacked hints. */}
                {tile.hint && tile.delta ? (
                  <div className="text-meta text-ink-soft flex-1 min-w-0">
                    {tile.hint}
                  </div>
                ) : (
                  <span />
                )}
                <Sparkline data={tile.sparkline} />
              </div>
            ) : null}
          </div>
        ) : null
      }
    />
  );

  // A tile only becomes interactive when the spec gives it somewhere to
  // go — no phantom hover states on read-only figures.
  if (!tile.action) return <Wrapper span={tile.span}>{body}</Wrapper>;

  if (tile.action.kind === "link") {
    return (
      <Wrapper span={tile.span}>
        <Link
          href={tile.action.href}
          aria-label={tile.action.label}
          className="block h-full rounded-[var(--radius-xl)] transition-shadow hover:shadow-soft"
        >
          {body}
        </Link>
      </Wrapper>
    );
  }

  const command = tile.action;
  return (
    <Wrapper span={tile.span}>
      <button
        type="button"
        aria-label={command.label}
        onClick={() =>
          command.kind === "command"
            ? run(command.command, command.payload)
            : undefined
        }
        className="block w-full h-full text-left rounded-[var(--radius-xl)] transition-shadow hover:shadow-soft"
      >
        {body}
      </button>
    </Wrapper>
  );
}

// The span has to live on the grid child, so it is applied here as well
// as inside the Card (the Card copy covers the plain, unwrapped case).
function Wrapper({
  span,
  children,
}: {
  span?: 1 | 2;
  children: ReactNode;
}) {
  return <div className={span === 2 ? "lg:col-span-2" : ""}>{children}</div>;
}
