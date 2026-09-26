"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import { FieldLabel } from "./FieldLabel";

// A labelled control with its error.
//
// The error is wired through aria-describedby and aria-invalid rather
// than only painted red, so it reaches a screen reader and anyone who
// cannot distinguish the colour.
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={errorId} className="text-meta text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-meta text-ink-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
