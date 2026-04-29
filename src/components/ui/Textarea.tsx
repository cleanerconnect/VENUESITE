"use client";

import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

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
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-eyebrow text-ink-soft">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={5}
        className={cn(
          "w-full px-3.5 py-3 bg-surface border rounded-[var(--radius-sm)] text-ink text-[14px] outline-none resize-y",
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
          <span className="text-meta text-ink-mute">{hint}</span>
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
