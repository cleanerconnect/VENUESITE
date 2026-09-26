// The name of a field, above the field.
//
// One component because there was one rule and four implementations of
// it: a floating `motion.label` inside `Input`, an eyebrow in `Select`,
// a different eyebrow in `Field`, and field-weight body text in
// `Textarea` and the spec blocks. A partner filling in Ma fiche and then
// Disponibilités met two of them on consecutive screens.
//
// The floating one was not merely inconsistent, it was wrong: a label
// that rests *inside* the control until the field has content prints
// itself over anything the browser draws there on its own — the
// « mm/dd/yyyy » of a date input, the « --:-- » of a time one — and
// `Input` had to suppress its own placeholder to avoid printing two
// strings in one box. Above the field, nothing can overlap anything.
//
// The geometry is in `.text-field-label` (13px, ink at 70%) and in the
// `gap-2` of the stacks that use it: 8px between the label and a 48px
// control. `docs/HANDOFF.md` § « Le motif de champ » states it once.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function FieldLabel({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  /** The asterisk, for the forms that mark their required fields. */
  required?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("text-field-label", className)}>
      {children}
      {required ? (
        <span className="text-danger" aria-hidden="true">
          {" *"}
        </span>
      ) : null}
    </label>
  );
}

/**
 * The same name where there is no single control to point `htmlFor` at.
 *
 * A radio group or a set of switches is labelled by its `<legend>`, not
 * by a `<label>` — pointing a label at one of the radios would name the
 * group after its first option.
 */
export function FieldLegend({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <legend className={cn("text-field-label", className)}>{children}</legend>
  );
}
