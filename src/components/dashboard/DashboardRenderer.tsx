"use client";

import type { ReactNode } from "react";
import type { Block, ScreenSpec } from "@/lib/dashboard/spec";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { useRole } from "@/lib/auth/role";
import { CommandProvider, type CommandHandler } from "./commands";
import { DetailDrawer } from "./DetailDrawer";
import { ActionLink } from "./primitives";
import { GreetingBlock } from "./blocks/GreetingBlock";
import { HeroBlock } from "./blocks/HeroBlock";
import { NudgeBlock } from "./blocks/NudgeBlock";
import { KpiGridBlock } from "./blocks/KpiGridBlock";
import { EntityListBlock } from "./blocks/EntityListBlock";
import { FloorPlanBlock } from "./blocks/FloorPlanBlock";
import { SlotGridBlock } from "./blocks/SlotGridBlock";
import { FeedBlock } from "./blocks/FeedBlock";
import { TableBlock } from "./blocks/TableBlock";
import { ChartBlock } from "./blocks/ChartBlock";
import { cn } from "@/lib/utils/cn";

// The renderer.
//
// It walks a spec and paints it. That is the whole contract — there is no
// screen-specific branch anywhere below, which is why a new screen costs
// a spec and not a page, and why the same screen can arrive from the
// backend at runtime.

const GAP: Record<"sm" | "md" | "lg", string> = {
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-6 md:gap-7",
};

export function DashboardRenderer({
  spec,
  commands,
  className,
}: {
  spec: ScreenSpec;
  /** Screen-local command handlers merged over the global registry. */
  commands?: Record<string, CommandHandler>;
  className?: string;
}) {
  const hasMobileLane = Boolean(spec.mobileBlocks?.length);

  return (
    <CommandProvider register={commands}>
      {/* When a screen ships a phone-first rewrite, the two lanes are
          mutually exclusive at the breakpoint. Otherwise one list serves
          both and per-block `surface` does the trimming. */}
      {hasMobileLane ? (
        <div className={cn("md:hidden space-y-4", className)}>
          <BlockList blocks={spec.mobileBlocks!} surface="mobile" />
        </div>
      ) : null}

      <Stagger
        className={cn(
          hasMobileLane ? "hidden md:block" : "",
          "space-y-6 md:space-y-7",
          className,
        )}
      >
        <BlockList
          blocks={spec.blocks}
          surface="desktop"
          wrap={(child, key) => <StaggerItem key={key}>{child}</StaggerItem>}
        />
      </Stagger>

      {/* Mounted once per screen — any row or tile in the spec can raise it. */}
      <DetailDrawer />
    </CommandProvider>
  );
}

function BlockList({
  blocks,
  surface,
  wrap,
}: {
  blocks: Block[];
  surface: "desktop" | "mobile";
  wrap?: (child: ReactNode, key: string) => ReactNode;
}) {
  const role = useRole();

  return (
    <>
      {blocks.map((block) => {
        // Lane filter: a block can opt out of the phone or the desktop
        // pass without either lane knowing why.
        if (block.surface && block.surface !== "both" && block.surface !== surface) {
          return null;
        }
        // Role filter mirrors RoleGate: render nothing until the role
        // resolves so a restricted block never flashes.
        if (block.allow) {
          if (role === null) return null;
          if (!block.allow.includes(role)) return null;
        }

        const node = <BlockView block={block} surface={surface} />;
        return wrap ? wrap(node, block.id) : <div key={block.id}>{node}</div>;
      })}
    </>
  );
}

function BlockView({
  block,
  surface,
}: {
  block: Block;
  surface: "desktop" | "mobile";
}) {
  switch (block.type) {
    case "greeting":
      return <GreetingBlock block={block} />;
    case "hero":
      return <HeroBlock block={block} />;
    case "nudge":
      return <NudgeBlock block={block} />;
    case "kpi-grid":
      return <KpiGridBlock block={block} surface={surface} />;
    case "entity-list":
      return <EntityListBlock block={block} />;
    case "floor-plan":
      return <FloorPlanBlock block={block} />;
    case "slot-grid":
      return <SlotGridBlock block={block} />;
    case "feed":
      return <FeedBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "chart":
      return <ChartBlock block={block} />;
    case "split":
      return <Split block={block} surface={surface} />;
    case "group":
      return <Group block={block} surface={surface} />;
    default: {
      // Exhaustiveness guard: a spec carrying a block type this build
      // doesn't know about is skipped, not fatal. Forward compatibility
      // matters once specs come over the wire.
      const _never: never = block;
      void _never;
      return null;
    }
  }
}

function Split({
  block,
  surface,
}: {
  block: Extract<Block, { type: "split" }>;
  surface: "desktop" | "mobile";
}) {
  const rail = block.railWidth ?? 380;
  return (
    <div
      className="grid grid-cols-1 gap-5"
      style={{
        gridTemplateColumns:
          surface === "mobile"
            ? undefined
            : `minmax(0, 1fr) minmax(${Math.round(rail * 0.84)}px, ${rail}px)`,
      }}
    >
      <div className="flex flex-col gap-5 min-w-0">
        <BlockList blocks={block.main} surface={surface} />
      </div>
      <div className="flex flex-col gap-5 min-w-0">
        <BlockList blocks={block.rail} surface={surface} />
      </div>
    </div>
  );
}

function Group({
  block,
  surface,
}: {
  block: Extract<Block, { type: "group" }>;
  surface: "desktop" | "mobile";
}) {
  return (
    <section>
      {block.heading ? (
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-h2 text-ink">{block.heading}</h2>
          {block.headingAction ? (
            <ActionLink action={block.headingAction} />
          ) : null}
        </div>
      ) : null}
      <div className={cn("flex flex-col", GAP[block.gap ?? "md"])}>
        <BlockList blocks={block.children} surface={surface} />
      </div>
    </section>
  );
}
