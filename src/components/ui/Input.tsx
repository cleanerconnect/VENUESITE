"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel } from "@/components/forms/FieldLabel";

// A field, named above itself.
//
// It used to float: the label rested inside the control and animated up
// on focus or when the field had content. Two things were wrong with
// that. It printed one string on top of another wherever the browser
// draws its own text inside the box — `mm/dd/yyyy` in a date input,
// `--:--` in a time one — and this component had to suppress its own
// placeholder to avoid doing it to itself. And it was one of four ways
// this codebase named a field, so a partner met a different pattern on
// Ma fiche than on Disponibilités.
//
// Now there is one: `FieldLabel` above a 48px control, 8px apart. The
// placeholder shows unconditionally, because nothing is in its way.
//
// White surface; the focus ring is the violet glow defined once in
// globals.css under `*:focus-visible`, not a per-component style.
interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  hint?: string;
  error?: string;
  /**
   * Mark the field as rejected without repeating the reason under it.
   *
   * A sign-in failure is one fact about two fields, so it is stated once
   * above the form; both fields still have to show they are the ones
   * being asked about again.
   */
  invalid?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  {
    label,
    hint,
    error,
    invalid,
    prefix,
    suffix,
    className,
    id,
    required,
    ...rest
  },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const noteId = `${inputId}-note`;
  const rejected = Boolean(error) || Boolean(invalid);

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={inputId} required={required}>
        {label}
      </FieldLabel>
      <div
        className={cn(
          "relative flex items-center h-12 bg-surface border rounded-[var(--radius-sm)]",
          "transition-colors duration-150",
          // No focus branch in JavaScript any more: the border follows
          // the real focus, which is what `:focus-within` is for, and
          // the component now keeps no state at all.
          rejected ? "border-danger/60" : "border-line focus-within:border-ink",
        )}
      >
        {prefix ? (
          <span className="pl-3.5 text-ink-mute">{prefix}</span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          required={required}
          className={cn(
            "w-full h-full px-4 bg-transparent text-ink text-body outline-none",
            "placeholder:text-ink-mute",
            className,
          )}
          aria-invalid={rejected || undefined}
          aria-describedby={hint || error ? noteId : undefined}
          {...rest}
        />
        {suffix ? (
          <span className="pr-2 text-meta text-ink-mute shrink-0 flex items-center">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <span id={noteId} className="text-meta text-danger flex items-center gap-1.5">
          {error}
        </span>
      ) : hint ? (
        <p id={noteId} data-prose className="text-meta text-ink-mute max-w-[62ch]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
