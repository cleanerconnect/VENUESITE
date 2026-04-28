"use client";

import { ArrowRight, Users } from "lucide-react";
import type { AudienceSegment } from "@/lib/types/visibility";

const FORMATTER = new Intl.NumberFormat("fr-FR");

export function SegmentGrid({
  segments,
  onSelect,
}: {
  segments: AudienceSegment[];
  onSelect: (segment: AudienceSegment) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {segments.map((seg) => (
        <button
          key={seg.id}
          type="button"
          onClick={() => onSelect(seg)}
          className="text-left bg-surface border border-line hover:border-violet-soft rounded-[var(--radius-lg)] p-5 transition-all hover:shadow-soft hover:-translate-y-[1px] outline-none focus-visible:ring-2 focus-visible:ring-violet"
        >
          <div className="flex items-start justify-between gap-3">
            <span
              aria-hidden
              className="h-9 w-9 rounded-[10px] bg-violet-soft flex items-center justify-center shrink-0"
            >
              <Users size={16} strokeWidth={1.7} className="text-violet-deep" />
            </span>
            <ArrowRight size={14} strokeWidth={1.8} className="text-ink-mute" />
          </div>
          <h3 className="text-h3 text-ink mt-4 leading-tight">
            {seg.name}
          </h3>
          <p className="text-meta text-ink-soft mt-2 leading-relaxed line-clamp-2">
            {seg.description}
          </p>
          <div className="mt-4 pt-3 border-t border-line-soft flex items-baseline justify-between">
            <span className="text-eyebrow text-ink-mute">Membres</span>
            <span
              className="text-violet-deep num"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {FORMATTER.format(seg.memberCount).replace(/ /g, " ")}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
