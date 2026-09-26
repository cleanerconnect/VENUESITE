"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel } from "@/components/forms/FieldLabel";

// Native select wrapped in our brand styling. Radix Select would ship a
// nicer popover but native is dependable on every Moroccan device and
// keyboard-accessible by default.
export function Select({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  className,
  defaultValue,
}: {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
  className?: string;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      <div className="relative">
        <select
          id={id}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            "w-full h-12 pl-4 pr-10 bg-surface border rounded-[var(--radius-sm)] text-ink text-body",
            "appearance-none focus:outline-none transition-colors duration-150",
            error ? "border-danger/60" : "border-line focus:border-ink",
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? noteId : undefined}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={1.6}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-mute"
        />
      </div>
      {error ? (
        <span id={noteId} className="text-meta text-danger">
          {error}
        </span>
      ) : hint ? (
        <p id={noteId} data-prose className="text-meta text-ink-mute max-w-[62ch]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
