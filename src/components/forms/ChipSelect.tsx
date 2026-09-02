"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

// Two chip controls, one look.
//
// `ChipSelect` toggles a fixed set (features, dietary markers). `ChipInput`
// takes free text (tags, ambience). They share the pill so a listing form
// does not read as two different controls stacked.

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  label,
  hint,
  error,
  /** Guard rail shown next to the label; enforced server-side as well. */
  max,
}: {
  options: readonly { id: T; label: string }[];
  value: readonly T[];
  onChange: (next: T[]) => void;
  label: string;
  hint?: string;
  error?: string;
  max?: number;
}) {
  const toggle = (id: T) =>
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );

  return (
    <fieldset>
      <ChipLegend label={label} count={value.length} max={max} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => toggle(option.id)}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border",
                "text-[13px] font-medium transition-colors",
                on
                  ? "border-ink bg-violet-soft text-ink"
                  : "border-line bg-surface text-ink-soft hover:border-ink/40",
              )}
            >
              {on ? <Check size={13} strokeWidth={2.4} /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
      <ChipFooter hint={hint} error={error} />
    </fieldset>
  );
}

export function ChipInput({
  value,
  onChange,
  label,
  placeholder,
  hint,
  error,
  max,
}: {
  value: readonly string[];
  onChange: (next: string[]) => void;
  label: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const atLimit = typeof max === "number" && value.length >= max;

  const commit = () => {
    const next = draft.trim();
    if (!next || atLimit || value.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...value, next]);
    setDraft("");
  };

  return (
    <fieldset>
      <ChipLegend label={label} count={value.length} max={max} />
      <div className="flex flex-wrap gap-2 items-center">
        {value.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1.5 h-9 pl-3.5 pr-2 rounded-full border border-ink bg-violet-soft text-ink text-[13px] font-medium"
          >
            {chip}
            <button
              type="button"
              aria-label={`Retirer ${chip}`}
              onClick={() => onChange(value.filter((v) => v !== chip))}
              className="h-5 w-5 rounded-full hover:bg-ink/[0.08] flex items-center justify-center text-ink-mute"
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          disabled={atLimit}
          placeholder={atLimit ? undefined : placeholder}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          // Enter commits; comma too, because people type lists that way.
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && draft === "" && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          className="h-9 min-w-[140px] flex-1 px-3 rounded-full border border-line bg-surface text-[13px] text-ink outline-none focus:border-ink disabled:opacity-50"
        />
      </div>
      <ChipFooter hint={hint} error={error} />
    </fieldset>
  );
}

function ChipLegend({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max?: number;
}) {
  return (
    <legend className="text-eyebrow text-ink-soft mb-2.5 flex items-center gap-2">
      {label}
      {typeof max === "number" ? (
        <span className="num font-medium text-ink-mute normal-case tracking-normal">
          {count}/{max}
        </span>
      ) : null}
    </legend>
  );
}

function ChipFooter({ hint, error }: { hint?: string; error?: string }) {
  if (error) return <p className="text-meta text-danger mt-2">{error}</p>;
  if (hint) return <p className="text-meta text-ink-mute mt-2">{hint}</p>;
  return null;
}
