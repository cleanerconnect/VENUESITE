"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { TableBlock as Spec, TableCell } from "@/lib/dashboard/spec";
import { ActionLink, MetricText, SpecBadge, TONE_COLOR } from "../primitives";
import { cn } from "@/lib/utils/cn";

// Dense tabular surface — settlement history, menu performance, service
// log. Columns declare their own alignment and default format, so a cell
// only overrides when it differs from its column.
export function TableBlock({ block }: { block: Spec }) {
  const empty = block.rows.length === 0;

  return (
    <Card variant="surface" size="md">
      {block.heading ? (
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-h3 text-ink">{block.heading}</h2>
          {block.headingAction ? (
            <ActionLink action={block.headingAction} />
          ) : null}
        </div>
      ) : null}

      {empty ? (
        <div className="py-8 text-center">
          <div className="text-body font-semibold text-ink">
            {block.empty?.title ?? "Aucune ligne"}
          </div>
          {block.empty?.body ? (
            <p className="text-meta text-ink-mute mt-1">{block.empty.body}</p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto scroll-thin -mx-2 px-2">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                {block.columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "text-eyebrow text-ink-mute pb-3 whitespace-nowrap",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      !col.align && "text-left",
                      col.hideOnMobile && "hidden md:table-cell",
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-line-soft last:border-0 hover:bg-canvas-2/60 transition-colors"
                >
                  {block.columns.map((col) => {
                    const cell = row.cells[col.key];
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "py-3.5 text-[13.5px] text-ink align-middle",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          col.hideOnMobile && "hidden md:table-cell",
                        )}
                      >
                        {cell ? (
                          <CellBody
                            cell={cell}
                            fallbackFormat={col.format}
                            href={col.key === block.columns[0].key ? row.href : undefined}
                          />
                        ) : (
                          <span className="text-ink-mute">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CellBody({
  cell,
  fallbackFormat,
  href,
}: {
  cell: TableCell;
  fallbackFormat?: Spec["columns"][number]["format"];
  href?: string;
}) {
  if (cell.badge) return <SpecBadge badge={cell.badge} />;

  if (cell.progress) {
    return (
      <div className="flex items-center gap-3 min-w-[140px]">
        <div className="flex-1">
          <ProgressBar
            value={cell.progress.value}
            max={cell.progress.max}
            tone={cell.progress.tone ?? "violet"}
            size="xs"
          />
        </div>
        <span className="text-meta text-ink-soft num shrink-0">
          <MetricText
            metric={{ value: cell.value, format: cell.format ?? fallbackFormat }}
          />
        </span>
      </div>
    );
  }

  const text = (
    <span style={cell.tone ? { color: TONE_COLOR[cell.tone] } : undefined}>
      <MetricText
        metric={{ value: cell.value, format: cell.format ?? fallbackFormat }}
      />
    </span>
  );

  return href ? (
    <Link href={href} className="font-semibold hover:text-violet-deep transition-colors">
      {text}
    </Link>
  ) : (
    text
  );
}
