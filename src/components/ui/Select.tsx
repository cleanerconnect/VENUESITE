"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Native select wrapped in our brand styling. Radix Select would ship a
// nicer popover but native is dependable on every Moroccan device and
// keyboard-accessible by default.
export function Select({
  label,
  value,
  onChange,
  options,
  hint,
  className,
  defaultValue,
}: {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-eyebrow text-ink-soft">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={id}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            "w-full h-12 pl-3.5 pr-10 bg-surface border border-line rounded-[var(--radius-sm)] text-ink text-[14px]",
            "appearance-none focus:outline-none focus:border-ink transition-colors duration-150",
          )}
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
      {hint ? <span className="text-meta text-ink-mute">{hint}</span> : null}
    </div>
  );
}
