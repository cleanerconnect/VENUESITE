"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

// An hour, in French, chosen from a list.
//
// A native `<input type="time">` renders its value from the browser's
// locale rather than the page's, so on a French portal opened in a
// browser set to English it draws `07:00 PM` beside a row that spells
// every other hour "19h00". A restaurateur reading `03:00 PM` for their
// lunch service closing time is being asked to translate their own
// opening hours.
//
// Quarter hours also happen to be the only values a service ever takes,
// and a list cannot be typed wrong: there is no 25h70 in it. A value
// already stored off the grid is kept and offered, so an existing 19h05
// is never silently rewritten by opening the screen.
const QUARTERS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

const label = (value: string) => value.replace(":", "h");

export function TimeSelect({
  id,
  value,
  disabled,
  ariaLabel,
  className,
  onChange,
}: {
  id?: string;
  /** `HH:MM`. */
  value: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  onChange: (next: string) => void;
}) {
  const options = useMemo(
    () => (QUARTERS.includes(value) ? QUARTERS : [value, ...QUARTERS]),
    [value],
  );

  return (
    <select
      id={id}
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "block h-11 w-full appearance-none rounded-[var(--radius-sm)] border border-line",
        "bg-surface px-3.5 pr-9 num text-body text-ink transition-colors",
        "focus:border-ink focus:outline-none disabled:opacity-55",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {label(o)}
        </option>
      ))}
    </select>
  );
}
