"use client";

import { Card } from "@/components/ui/Card";
import type { GreetingBlock as Spec } from "@/lib/dashboard/spec";
import { ActionControl, cardVariant } from "../primitives";
import { cn } from "@/lib/utils/cn";

// Page opener. The mixed-typography H1 (sans lead + Fraunces italic
// clause) is the house gesture — but *which* words go in the italic is
// the spec's call, not this component's.
export function GreetingBlock({ block }: { block: Spec }) {
  const [primary, ...rest] = block.actions ?? [];

  return (
    <Card
      variant={cardVariant(block.tone ?? "canvas-2")}
      size="lg"
      className="min-h-[220px]"
    >
      <div className="flex flex-col h-full justify-between gap-6">
        <div>
          {block.eyebrow ? (
            <div className="text-eyebrow text-ink-mute">{block.eyebrow}</div>
          ) : null}
          {/* `leading-[1.05]` was here, overriding the 1.2 that
              `.text-h1` declares — a step of the scale retuned at one
              call site, which is how a scale stops being one. And the
              `mt-2` was unconditional: with the eyebrow gone in Lot 1 it
              was eight pixels of nothing at the top of the card. */}
          <h1
            className={cn(
              "text-h1 text-ink max-w-md",
              block.eyebrow && "mt-2",
            )}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {block.title}
            {block.emphasis ? (
              <>
                {" "}
                <span
                  className="font-serif-italic text-violet-deep"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {block.emphasis}
                </span>
              </>
            ) : null}
          </h1>
          {block.subline ? (
            <p data-prose className="text-body text-ink-soft mt-4 max-w-md">
              {block.subline}
            </p>
          ) : null}
        </div>

        {block.actions?.length ? (
          <div className="flex items-center gap-3 flex-wrap">
            {primary ? <ActionControl cta={primary} size="lg" /> : null}
            {/* Filled then outlined, the pair the event Overview draws:
                the primary at 56px, the outlined one at the 44px floor
                every control in host density answers to. */}
            {rest.map((cta, i) => (
              <ActionControl
                key={`${cta.action.label}-${i}`}
                cta={{ ...cta, variant: cta.variant ?? "secondary" }}
                size="md"
              />
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
