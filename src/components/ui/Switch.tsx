"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils/cn";

// On or off, drawn as the thing it is.
//
// Half the portal used to say on/off with a coloured pill reading OUVERT
// or ACTIVÉ. A pill is a status: it says where things stand and gives no
// hint that pressing it changes them, so a host reads the screen as a
// report and never touches it. This reads as a switch in every app they
// already use.
//
// Two shapes, one control. With `label` or `description` it is its own
// label and wraps them; bare, it takes an `id` so a caller that has
// already drawn the label — a settings row with a badge in it — can
// point at it instead of nesting a second one.
//
// `size="lg"` is for the one switch a screen is about, like the master
// booking switch on Disponibilités, where the primary control should also
// be the largest one.
export function Switch({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  ariaLabel,
  size = "md",
  disabled,
}: {
  id?: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
  description?: string;
  /** Names a bare switch that no visible `<label>` points at. */
  ariaLabel?: string;
  size?: "md" | "lg";
  disabled?: boolean;
}) {
  const lg = size === "lg";

  const root = (
    <RadixSwitch.Root
      id={id}
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative shrink-0 rounded-full transition-colors duration-200",
        "data-[state=checked]:bg-ink data-[state=unchecked]:bg-ink/15",
        lg ? "h-9 w-16" : "h-7 w-12",
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          "block rounded-full bg-canvas shadow-sm",
          "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          lg
            ? "h-7 w-7 translate-x-1 data-[state=checked]:translate-x-[32px]"
            : "h-6 w-6 translate-x-0.5 data-[state=checked]:translate-x-[22px]",
        )}
      />
    </RadixSwitch.Root>
  );

  if (!label && !description) return root;

  return (
    <label
      className={cn(
        "flex items-start gap-3 cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span className="mt-0.5">{root}</span>
      <span className="leading-tight">
        {label ? (
          <span className="block text-[14px] font-semibold text-ink">{label}</span>
        ) : null}
        {description ? (
          <span className="block text-[13px] text-ink-soft mt-0.5 leading-relaxed">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
