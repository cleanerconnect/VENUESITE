"use client";

import { Card } from "@/components/ui/Card";
import type { GreetingBlock as Spec } from "@/lib/dashboard/spec";
import { ActionControl, cardVariant } from "../primitives";

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
          <h1
            className="text-h1 text-ink mt-2 leading-[1.05] max-w-md"
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
            <p className="text-body text-ink-soft mt-3 max-w-md">
              {block.subline}
            </p>
          ) : null}
        </div>

        {block.actions?.length ? (
          <div className="flex items-center gap-3 flex-wrap">
            {primary ? <ActionControl cta={primary} size="lg" /> : null}
            {rest.map((cta, i) => (
              <ActionControl
                key={`${cta.action.label}-${i}`}
                cta={{ ...cta, variant: cta.variant ?? "secondary" }}
                size="sm"
              />
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
