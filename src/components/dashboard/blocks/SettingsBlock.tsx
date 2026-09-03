"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type {
  SettingControl,
  SettingRow,
  SettingsBlock as Spec,
} from "@/lib/dashboard/spec";
import { ActionControl, Icon, SpecBadge, TONE_COLOR } from "../primitives";
import { useCommandRunner } from "../commands";
import { useRole } from "@/lib/auth/role";
import { cn } from "@/lib/utils/cn";

// Editable settings, declared rather than written.
//
// Half of what the venue perimeter asks for is configuration: pacing
// rules, deposit policy, cancellation terms, tag thresholds, guest
// message timing. Writing each as a bespoke form would mean a dozen
// screens that drift apart in spacing, in validation and in how they say
// "saved".
//
// So a setting is a row: a label, a hint, a named control and the
// command it dispatches. The control is a value like everything else in
// a spec, which is what keeps these screens shippable from a backend.
//
// Every control is optimistic and says so: the value moves at once and a
// short "Enregistré" confirms it, because a setting that snaps back
// silently is indistinguishable from one that did not save.

export function SettingsBlock({ block }: { block: Spec }) {
  return (
    <Card variant="surface" size="md">
      {block.heading ? (
        <div className="mb-4">
          <h2 className="text-h3 text-ink">{block.heading}</h2>
          {block.subheading ? (
            <p className="text-meta text-ink-mute mt-1">{block.subheading}</p>
          ) : null}
        </div>
      ) : null}

      {block.banner ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-[var(--radius-sm)] border border-line bg-canvas-2 p-3"
        >
          <span
            aria-hidden
            className="mt-[3px] h-2 w-2 shrink-0 rounded-full"
            style={{ background: TONE_COLOR[block.banner.tone] }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">{block.banner.title}</p>
            {block.banner.body ? (
              <p className="text-meta text-ink-mute mt-0.5">{block.banner.body}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-line">
        {block.rows.map((row) => (
          <SettingRowView key={row.id} row={row} />
        ))}
      </div>

      {block.footerActions?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {block.footerActions.map((cta, i) => (
            <ActionControl key={`${cta.action.label}-${i}`} cta={cta} size="sm" />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function SettingRowView({ row }: { row: SettingRow }) {
  const run = useCommandRunner();
  const role = useRole();
  const [value, setValue] = useState(() => row.control.value);
  const [saved, setSaved] = useState(false);

  // A control the viewer may look at but not change. Rendering nothing
  // would make the screen lie about what the venue is configured to do.
  const readOnly =
    row.control.kind === "readonly" ||
    Boolean(row.allow && (role === null || !row.allow.includes(role)));

  // Re-sync when the server hands back a different value than the
  // optimistic one — the write was refused, or another editor won.
  useEffect(() => setValue(row.control.value), [row.control.value]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [saved]);

  const commit = (next: string | number | boolean) => {
    setValue(next as typeof value);
    setSaved(true);
    run(row.command, { ...row.payload, value: next });
  };

  return (
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <label
            htmlFor={`set-${row.id}`}
            className="text-[13.5px] font-semibold text-ink"
          >
            {row.label}
          </label>
          {row.badge ? <SpecBadge badge={row.badge} /> : null}
          {saved ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.06em] text-sage-deep">
              <Icon name="check" size={11} strokeWidth={2.4} />
              Enregistré
            </span>
          ) : null}
        </div>
        {row.hint ? (
          <p className="text-meta text-ink-mute mt-1 max-w-[62ch]">{row.hint}</p>
        ) : null}
      </div>

      <div className="shrink-0">
        <Control
          id={`set-${row.id}`}
          control={row.control}
          value={value}
          readOnly={readOnly}
          onCommit={commit}
        />
      </div>
    </div>
  );
}

const FIELD =
  "h-10 rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-[13px] text-ink " +
  "focus:outline-none focus:border-ink transition-colors disabled:opacity-55";

function Control({
  id,
  control,
  value,
  readOnly,
  onCommit,
}: {
  id: string;
  control: SettingControl;
  value: SettingControl["value"];
  readOnly: boolean;
  onCommit: (next: string | number | boolean) => void;
}) {
  switch (control.kind) {
    case "toggle":
      return (
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          disabled={readOnly}
          onClick={() => onCommit(!value)}
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors disabled:opacity-55",
            value ? "bg-ink" : "bg-ink/15",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-soft transition-[left]",
              value ? "left-[22px]" : "left-0.5",
            )}
          />
        </button>
      );

    case "number":
      return (
        <input
          id={id}
          type="number"
          disabled={readOnly}
          value={String(value)}
          min={control.min}
          max={control.max}
          step={control.step}
          // On blur rather than on every keystroke: a spinner held down
          // would otherwise fire a write per increment.
          onChange={(e) => onCommit(Number(e.target.value))}
          className={cn(FIELD, "w-24 num text-right")}
        />
      );

    case "text":
      return control.multiline ? (
        <textarea
          id={id}
          disabled={readOnly}
          defaultValue={String(value)}
          placeholder={control.placeholder}
          rows={3}
          onBlur={(e) => onCommit(e.target.value)}
          className={cn(
            FIELD,
            "h-auto w-[min(28rem,60vw)] py-2 leading-snug resize-y",
          )}
        />
      ) : (
        <input
          id={id}
          type="text"
          disabled={readOnly}
          defaultValue={String(value)}
          placeholder={control.placeholder}
          onBlur={(e) => onCommit(e.target.value)}
          className={cn(FIELD, "w-[min(20rem,50vw)]")}
        />
      );

    case "select":
      return (
        <select
          id={id}
          disabled={readOnly}
          value={String(value)}
          onChange={(e) => onCommit(e.target.value)}
          className={cn(FIELD, "w-[min(16rem,45vw)] appearance-none pr-9")}
        >
          {control.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );

    case "time":
    case "date":
      return (
        <input
          id={id}
          type={control.kind}
          disabled={readOnly}
          value={String(value)}
          onChange={(e) => onCommit(e.target.value)}
          className={cn(FIELD, "num")}
        />
      );

    case "readonly":
      return control.href ? (
        <Link
          href={control.href}
          className="text-[13px] font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
        >
          {String(value)}
        </Link>
      ) : (
        <span className="text-[13px] text-ink-mute num">{String(value)}</span>
      );
  }
}
