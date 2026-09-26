"use client";

import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel } from "@/components/forms/FieldLabel";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  count?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, hint, error, count, className, id, ...rest },
  ref,
) {
  const inputId = id ?? useId();
  return (
    <div className="flex flex-col gap-2">
      {/* The same label as every other field in the portal — see
          `FieldLabel`. It used to be field-weight body text, written to
          sit beside the floating labels of the Inputs around it; those
          no longer float, and both now name a field the one way. */}
      {label ? <FieldLabel htmlFor={inputId}>{label}</FieldLabel> : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={5}
        className={cn(
          "w-full px-3.5 py-3 bg-surface border rounded-[var(--radius-sm)] text-ink text-body outline-none resize-y",
          "transition-colors duration-150 placeholder:text-ink-mute",
          "focus:border-ink",
          error ? "border-danger/60" : "border-line",
          className,
        )}
        {...rest}
      />
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <span className="text-meta text-danger">{error}</span>
        ) : hint ? (
          <p data-prose className="text-meta text-ink-mute max-w-[62ch]">{hint}</p>
        ) : (
          <span />
        )}
        {typeof count === "number" ? (
          <span className="text-meta text-ink-mute num">{count}</span>
        ) : null}
      </div>
    </div>
  );
});
