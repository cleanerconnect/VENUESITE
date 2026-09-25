"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { TimeSelect } from "@/components/ui/TimeSelect";
import type {
  SettingControl,
  SettingRow,
  SettingsBlock as Spec,
} from "@/lib/dashboard/spec";
import { ActionControl, SpecBadge, TONE_COLOR } from "../primitives";
import { useRole } from "@/lib/auth/role";
import { useSettingsDraft } from "@/lib/stores/settings-draft";
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
// The row is drawn as a form field and nothing else: a bordered box with
// its label above it. The old shape — label on the left, a bare value on
// the right — read as a printed list rather than as something editable,
// and a host who cannot see the border does not know they may type in it.
// On/off is always a switch, never a word standing in for one.
//
// Nothing writes on change. Edits stage into the screen's draft store and
// leave together, under the one Enregistrer at the foot of the screen.

export function SettingsBlock({ block }: { block: Spec }) {
  const [open, setOpen] = useState(!block.collapsed);
  const rows = <Rows rows={block.rows} />;

  if (block.collapsed) {
    return (
      <Card variant="surface" size="md">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span className="min-w-0">
            <span className="block text-h3 text-ink">{block.heading}</span>
            {block.subheading ? (
              <span className="text-meta text-ink-mute mt-1 block">
                {block.subheading}
              </span>
            ) : null}
          </span>
          <ChevronDown
            size={20}
            strokeWidth={2.2}
            aria-hidden
            className={cn(
              "shrink-0 text-ink-mute transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {open ? <div className="mt-5">{rows}</div> : null}
      </Card>
    );
  }

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
            className="mt-[6px] h-2 w-2 shrink-0 rounded-full"
            style={{ background: TONE_COLOR[block.banner.tone] }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-ink">{block.banner.title}</p>
            {block.banner.body ? (
              <p className="text-meta text-ink-mute mt-0.5">{block.banner.body}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {rows}

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

/**
 * Two fields to a line where they fit, one where they do not.
 *
 * A time and a capacity are three characters wide; giving each of them
 * the full width of a card puts four fields below the fold for no gain.
 * Anything that needs the room — a switch, a paragraph, a channel
 * matrix — asks for the whole line.
 */
function Rows({ rows }: { rows: SettingRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <SettingRowView key={row.id} row={row} />
      ))}
    </div>
  );
}

const WIDE = new Set(["toggle", "switches", "readonly"]);

function SettingRowView({ row }: { row: SettingRow }) {
  const role = useRole();
  const stage = useSettingsDraft((s) => s.stage);
  const staged = useSettingsDraft((s) => s.edits[row.id]);
  const revision = useSettingsDraft((s) => s.revision);
  const [value, setValue] = useState(() => row.control.value);

  // A control the viewer may look at but not change. Rendering nothing
  // would make the screen lie about what the venue is configured to do.
  const readOnly =
    row.control.kind === "readonly" ||
    Boolean(row.allow && (role === null || !row.allow.includes(role)));

  // Re-sync when the server hands back a different value than the staged
  // one, and when the screen's drafts are discarded.
  useEffect(() => setValue(row.control.value), [row.control.value, revision]);

  const commit = (next: string | number | boolean) => {
    setValue(next as typeof value);
    stage(row.id, { command: row.command, payload: row.payload ?? {}, value: next });
  };

  const lead = row.emphasis === "lead";
  const wide =
    lead ||
    WIDE.has(row.control.kind) ||
    (row.control.kind === "text" && row.control.multiline);

  const label = (
    <span className="flex flex-wrap items-center gap-2">
      <span className={lead ? "text-host-lead text-ink" : "text-[14.5px] font-semibold leading-snug text-ink"}>
        {row.label}
      </span>
      {row.badge ? <SpecBadge badge={row.badge} /> : null}
      {staged ? (
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-mute">
          Modifié
        </span>
      ) : null}
    </span>
  );

  const hint = row.hint ? (
    <p className="text-meta text-ink-mute mt-1 max-w-[62ch]">{row.hint}</p>
  ) : null;

  // A switch is its own field: the label reads as a statement and the
  // switch answers it, so they share a line inside the border.
  if (row.control.kind === "toggle") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border bg-surface",
          lead ? "border-ink/25 px-4 py-4" : "border-line px-3.5 py-3",
          wide && "sm:col-span-2",
        )}
      >
        <label htmlFor={`set-${row.id}`} className="min-w-0 cursor-pointer">
          {label}
          {hint}
        </label>
        <Control
          id={`set-${row.id}`}
          control={row.control}
          value={value}
          readOnly={readOnly}
          lead={lead}
          onCommit={commit}
        />
      </div>
    );
  }

  // A channel matrix and a read-only value have no single field for a
  // `<label>` to point at — the switches name themselves — so those get a
  // heading instead of a label that addresses nothing.
  const titled = row.control.kind === "switches" || row.control.kind === "readonly";
  const Title = titled ? "div" : "label";

  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <Title
        {...(titled ? {} : { htmlFor: `set-${row.id}` })}
        className="block"
      >
        {label}
        {hint}
      </Title>
      <div className="mt-1.5">
        <Control
          id={`set-${row.id}`}
          control={row.control}
          value={value}
          readOnly={readOnly}
          lead={lead}
          onCommit={commit}
        />
      </div>
    </div>
  );
}

// Every field carries its border and its own height. 44px is the host
// minimum — a target a thumb finds on the pass without aiming.
const FIELD =
  "block h-11 w-full rounded-[var(--radius-sm)] border border-line bg-surface px-3.5 " +
  "text-body text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 " +
  "transition-colors disabled:opacity-55";

function Control({
  id,
  control,
  value,
  readOnly,
  lead,
  onCommit,
}: {
  id: string;
  control: SettingControl;
  value: SettingControl["value"];
  readOnly: boolean;
  lead?: boolean;
  onCommit: (next: string | number | boolean) => void;
}) {
  switch (control.kind) {
    case "toggle":
      return (
        <Switch
          id={id}
          checked={Boolean(value)}
          disabled={readOnly}
          size={lead ? "lg" : "md"}
          onCheckedChange={onCommit}
        />
      );

    // The channels an alert goes out on: independent switches, because
    // an alert that matters goes out by push *and* e-mail. A select would
    // have made the venue pick one and lose the other.
    case "switches": {
      const on = new Set(String(value).split(",").filter(Boolean));
      return (
        <div className="flex flex-wrap gap-2">
          {control.options.map((o) => (
            <span
              key={o.value}
              className={cn(
                "flex min-h-11 flex-1 basis-[9rem] items-center justify-between gap-3",
                "rounded-[var(--radius-sm)] border bg-surface px-3.5 py-2",
                on.has(o.value) ? "border-ink/25" : "border-line",
              )}
            >
              <span className="text-[14.5px] font-semibold text-ink">{o.label}</span>
              <Switch
                checked={on.has(o.value)}
                ariaLabel={o.label}
                disabled={readOnly}
                onCheckedChange={(next) => {
                  const kept = control.options
                    .map((c) => c.value)
                    .filter((c) => (c === o.value ? next : on.has(c)));
                  onCommit(kept.join(","));
                }}
              />
            </span>
          ))}
        </div>
      );
    }

    case "number":
      // The suffix is the unit. Without it a box reading 60 next to
      // "Le carnet ouvre à" is a number with no idea what it counts;
      // the spec type has carried the field all along, unrendered.
      return (
        <span className="flex items-center gap-2">
          <input
            id={id}
            type="number"
            disabled={readOnly}
            value={String(value)}
            min={control.min}
            max={control.max}
            step={control.step}
            onChange={(e) => onCommit(Number(e.target.value))}
            className={cn(FIELD, "num max-w-[12rem]")}
          />
          {control.suffix ? (
            <span className="text-[14px] text-ink-mute shrink-0">
              {control.suffix}
            </span>
          ) : null}
        </span>
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
          className={cn(FIELD, "h-auto py-2.5 leading-snug resize-y")}
        />
      ) : (
        <input
          id={id}
          type="text"
          disabled={readOnly}
          defaultValue={String(value)}
          placeholder={control.placeholder}
          onBlur={(e) => onCommit(e.target.value)}
          className={FIELD}
        />
      );

    case "select":
      return (
        <select
          id={id}
          disabled={readOnly}
          value={String(value)}
          onChange={(e) => onCommit(e.target.value)}
          className={cn(FIELD, "appearance-none pr-9")}
        >
          {control.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );

    // An hour is a list of quarter hours in French, not a native time
    // input drawing `07:00 PM` on a French screen.
    case "time":
      return (
        <TimeSelect
          id={id}
          value={String(value)}
          disabled={readOnly}
          onChange={onCommit}
          className="max-w-[14rem]"
        />
      );

    case "date": {
      const compact = control.compact;
      return (
        <input
          id={id}
          type="date"
          disabled={readOnly}
          value={String(value)}
          // Bounds only exist on a date, and only where the caller set
          // them — a picker that offers a day the dataset cannot answer
          // for is a picker that leads to an empty screen.
          min={control.min}
          max={control.max}
          aria-label={control.label}
          title={control.label}
          onChange={(e) => onCommit(e.target.value)}
          className={cn(
            FIELD,
            "num",
            compact ? "date-compact w-[52px] px-2" : "max-w-[14rem]",
          )}
        />
      );
    }

    case "readonly":
      return control.href ? (
        <Link
          href={control.href}
          className="text-body font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
        >
          {String(value)}
        </Link>
      ) : (
        <span className="text-body text-ink-soft num">{String(value)}</span>
      );
  }
}
