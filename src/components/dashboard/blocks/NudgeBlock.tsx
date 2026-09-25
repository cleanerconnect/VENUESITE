"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { NudgeBlock as Spec } from "@/lib/dashboard/spec";
import { Icon } from "../primitives";
import { useCommandRunner } from "../commands";
import { useRole } from "@/lib/auth/role";

// Violet-soft advisory surface. Reserved for assistant output — the
// direction review pulled it out of the dark hero precisely so live
// status and forward-looking suggestions never share a card.
//
// Its CTAs render as text affordances rather than buttons: a suggestion
// invites, it doesn't demand.
export function NudgeBlock({ block }: { block: Spec }) {
  const run = useCommandRunner();
  const role = useRole();

  const actions = (block.actions ?? []).filter((cta) => {
    if (!cta.allow) return true;
    return role !== null && cta.allow.includes(role);
  });

  return (
    <Card variant="violet-soft" size="md">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="h-9 w-9 rounded-chip bg-surface/70 flex items-center justify-center shrink-0"
        >
          <Icon
            name={block.icon ?? "sparkles"}
            size={16}
            className="text-violet-deep"
          />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-eyebrow text-violet-deep">{block.eyebrow}</div>
          <div className="text-[14px] text-ink mt-2 leading-relaxed">
            {block.headline ? (
              <span className="font-semibold">{block.headline} </span>
            ) : null}
            <span className="text-ink-soft">{block.body}</span>
          </div>

          {actions.length ? (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {actions.map((cta, i) => {
                const primary = (cta.variant ?? "primary") === "primary";
                const cls = primary
                  ? "text-meta font-bold uppercase tracking-[0.08em] text-violet-deep hover:text-ink transition-colors"
                  : "text-meta font-medium text-ink-mute hover:text-ink transition-colors";

                return cta.action.kind === "link" ? (
                  <Link
                    key={`${cta.action.label}-${i}`}
                    href={cta.action.href}
                    className={cls}
                  >
                    {cta.action.label}
                  </Link>
                ) : (
                  <button
                    key={`${cta.action.label}-${i}`}
                    type="button"
                    className={cls}
                    onClick={() =>
                      cta.action.kind === "command"
                        ? run(cta.action.command, cta.action.payload)
                        : undefined
                    }
                  >
                    {cta.action.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
