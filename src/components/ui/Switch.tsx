"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/utils/cn";

// Toggle switch with optional label + description block. Used for tier
// transferability, refund policy nuances, notification preferences.
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <RadixSwitch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative w-10 h-6 rounded-full shrink-0 mt-0.5 transition-colors duration-200",
          "data-[state=checked]:bg-ink data-[state=unchecked]:bg-ink/15",
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            "block w-5 h-5 bg-canvas rounded-full shadow-sm",
            "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "translate-x-0.5 data-[state=checked]:translate-x-[18px]",
          )}
        />
      </RadixSwitch.Root>
      {label || description ? (
        <span className="leading-tight">
          {label ? (
            <span className="block text-[14px] font-semibold text-ink">
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="block text-[13px] text-ink-soft mt-0.5 leading-relaxed">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
