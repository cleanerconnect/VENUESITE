"use client";

import Link from "next/link";
import { motion } from "motion/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";
import type { EntityListBlock as Spec, EntityRow } from "@/lib/dashboard/spec";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ActionLink,
  Icon,
  MetricText,
  SpecBadge,
} from "../primitives";
import { useCommandRunner } from "../commands";
import { cn } from "@/lib/utils/cn";

// The row card behind every "list of things" on the platform: upcoming
// events, tonight's covers, tables in service, menu items. It knows about
// a title, badges, a meta line, a progress bar, a trailing figure and a
// signal strip — never about what any of them mean.
export function EntityListBlock({ block }: { block: Spec }) {
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

      {block.rows.length === 0 ? (
        <EmptyState
          title={block.empty?.title ?? "Rien à afficher"}
          description={block.empty?.body}
          cta={
            block.empty?.action?.kind === "link"
              ? { label: block.empty.action.label, href: block.empty.action.href }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {block.rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}

function Row({ row }: { row: EntityRow }) {
  const run = useCommandRunner();

  const inner = (
    <div className="flex items-center gap-4">
      <Leading row={row} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-h3 text-ink truncate">{row.title}</h4>
          {row.badges?.map((badge, i) => (
            <SpecBadge key={`${badge.label}-${i}`} badge={badge} />
          ))}
        </div>

        {row.meta ? (
          <div className="text-meta text-ink-mute mt-1 num">{row.meta}</div>
        ) : null}

        {row.progress ? (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 max-w-[280px]">
              <ProgressBar
                value={row.progress.value}
                max={row.progress.max}
                tone={row.progress.tone ?? "violet"}
                size="xs"
              />
            </div>
            {row.progressCaption ? (
              <div className="text-meta text-ink-soft num shrink-0">
                {row.progressCaption}
              </div>
            ) : null}
          </div>
        ) : null}

        {row.signal ? (
          <div className="mt-3 inline-flex items-start gap-1.5 max-w-full bg-violet-soft text-violet-deep rounded-[var(--radius-sm)] px-2.5 py-1.5">
            <Icon
              name={row.signal.icon ?? "sparkles"}
              size={12}
              strokeWidth={1.9}
              className="shrink-0 mt-[1px]"
            />
            <span className="text-[12px] leading-snug font-medium truncate">
              {row.signal.text}
            </span>
          </div>
        ) : null}
      </div>

      {row.trailing ? (
        <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
          <div className="text-eyebrow text-ink-mute">{row.trailing.label}</div>
          <div className="text-h3 text-ink num">
            <MetricText metric={row.trailing.metric} />
          </div>
        </div>
      ) : null}

      {/* Reserves the kebab's footprint — the real trigger is positioned
          absolutely so it never nests inside the row's <Link>. */}
      {row.menu?.length ? <div className="w-9 h-9 shrink-0" aria-hidden /> : null}
    </div>
  );

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative bg-surface border border-line rounded-[var(--radius-lg)] hover:shadow-soft transition-shadow">
        {row.href ? (
          <Link href={row.href} className="block p-4">
            {inner}
          </Link>
        ) : (
          <div className="p-4">{inner}</div>
        )}

        {row.menu?.length ? (
          <div className="absolute top-4 right-4">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="h-9 w-9 rounded-full hover:bg-ink/[0.04] flex items-center justify-center text-ink-mute transition-colors"
                  aria-label="Actions"
                >
                  <MoreVertical size={16} strokeWidth={1.8} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="min-w-[220px] bg-surface border border-line rounded-[var(--radius-md)] shadow-soft p-1 z-50"
                >
                  {row.menu.map((item) => (
                    <DropdownMenu.Item
                      key={item.id}
                      onSelect={() => {
                        if (item.action.kind === "command") {
                          run(item.action.command, item.action.payload);
                        } else if (typeof window !== "undefined") {
                          window.location.assign(item.action.href);
                        }
                      }}
                      className={cn(
                        "px-3 h-9 flex items-center rounded-[var(--radius-sm)] text-[13.5px]",
                        "hover:bg-ink/[0.04] cursor-pointer outline-none",
                        item.destructive ? "text-danger" : "text-ink",
                      )}
                    >
                      {item.label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

// Three leading treatments, in priority order: an icon tile, guest-style
// initials, or the gradient placeholder the events list uses for covers.
function Leading({ row }: { row: EntityRow }) {
  if (row.icon) {
    return (
      <div
        className="hidden sm:flex w-14 h-14 rounded-[14px] shrink-0 items-center justify-center bg-violet-soft text-violet-deep"
        aria-hidden
      >
        <Icon name={row.icon} size={20} strokeWidth={1.7} />
      </div>
    );
  }

  if (row.initials) {
    return (
      <div
        className="hidden sm:flex w-14 h-14 rounded-[14px] shrink-0 items-center justify-center bg-violet-soft text-violet-deep font-bold text-[15px]"
        aria-hidden
      >
        {row.initials.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className="hidden sm:block w-20 h-20 rounded-[12px] shrink-0 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, var(--color-violet-soft), var(--color-tint-sky))",
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(134,91,166,0.35), transparent 70%)",
        }}
      />
    </div>
  );
}
