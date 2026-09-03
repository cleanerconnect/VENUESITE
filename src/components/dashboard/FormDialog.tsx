"use client";

import { useState, useTransition } from "react";
import { SideSheet } from "@/components/ui/SideSheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useFormDialog, type FormPayload } from "@/lib/stores/form-dialog";
import type { FormField } from "@/lib/dashboard/spec";
import { runScreenCommand } from "@/app/actions/screen-command";
import { cn } from "@/lib/utils/cn";

// The spec-driven form.
//
// Mounted once per screen, like the detail drawer. Any button whose
// command the screen declared a form for raises it, prefilled from the
// button's own payload — an id, a date, a table — so "Modifier le délai"
// on row 3 knows it is row 3 without the form knowing what a row is.
//
// Submission goes to one server action, which resolves the command name
// against the same closed list the repository exposes. The client never
// names a table or a column.

export function FormDialog() {
  const spec = useFormDialog((s) => s.spec);
  const payload = useFormDialog((s) => s.payload);
  const close = useFormDialog((s) => s.close);
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!spec) {
    return (
      <SideSheet open={false} onOpenChange={() => {}} title="">
        {null}
      </SideSheet>
    );
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    // Validated here as well as server-side. The client check is for the
    // person filling it in; the server check is the one that counts.
    const missing: Record<string, string> = {};
    const values: FormPayload = { ...payload };
    for (const field of spec.fields) {
      if (field.kind === "note") continue;
      const raw = data.get(field.name);
      if (field.kind === "toggle") {
        values[field.name] = raw === "on";
        continue;
      }
      const text = typeof raw === "string" ? raw.trim() : "";
      if ("required" in field && field.required && text === "") {
        missing[field.name] = "Ce champ est obligatoire.";
        continue;
      }
      values[field.name] = field.kind === "number" ? Number(text || 0) : text;
    }

    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return;
    }
    setErrors({});

    start(async () => {
      const result = await runScreenCommand(spec.command, values);
      if (result.ok) {
        toast({ tone: "success", title: result.message ?? "Enregistré" });
        close();
      } else {
        toast({ tone: "danger", title: result.message ?? "L'enregistrement a échoué" });
      }
    });
  };

  return (
    <SideSheet
      open
      onOpenChange={(next) => (next ? undefined : close())}
      title={spec.title}
      description={spec.description}
    >
      <form onSubmit={submit} className="space-y-5">
        {spec.fields.map((field) => (
          <Field key={field.name} field={field} error={errors[field.name]} />
        ))}

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            variant={spec.destructive ? "destructive" : "ink"}
            disabled={pending}
          >
            {pending ? "Enregistrement…" : spec.submitLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={close} disabled={pending}>
            Annuler
          </Button>
        </div>
      </form>
    </SideSheet>
  );
}

const FIELD =
  "w-full h-11 rounded-[var(--radius-sm)] border border-line bg-surface px-3 text-[14px] text-ink " +
  "focus:outline-none focus:border-ink transition-colors";

function Field({ field, error }: { field: FormField; error?: string }) {
  if (field.kind === "note") {
    return (
      <p className="text-meta text-ink-mute leading-snug">
        <span className="font-semibold text-ink">{field.label}</span>
        {field.hint ? ` ${field.hint}` : null}
      </p>
    );
  }

  const id = `form-${field.name}`;

  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink mb-1.5">
        {field.label}
        {"required" in field && field.required ? (
          <span className="text-danger"> *</span>
        ) : null}
      </label>

      {field.kind === "textarea" ? (
        <textarea
          id={id}
          name={field.name}
          rows={field.rows ?? 3}
          defaultValue={field.value}
          placeholder={field.placeholder}
          className={cn(FIELD, "h-auto py-2.5 leading-snug resize-y", error && "border-danger")}
        />
      ) : field.kind === "select" ? (
        <select
          id={id}
          name={field.name}
          defaultValue={field.value}
          className={cn(FIELD, "appearance-none", error && "border-danger")}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.kind === "toggle" ? (
        <input
          id={id}
          name={field.name}
          type="checkbox"
          defaultChecked={field.value}
          className="h-5 w-5 accent-[var(--color-ink)]"
        />
      ) : (
        <input
          id={id}
          name={field.name}
          type={
            field.kind === "number"
              ? "number"
              : field.kind === "date"
                ? "date"
                : field.kind === "time"
                  ? "time"
                  : field.kind === "tel"
                    ? "tel"
                    : "text"
          }
          defaultValue={field.value === undefined ? undefined : String(field.value)}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          min={field.kind === "number" ? field.min : undefined}
          max={field.kind === "number" ? field.max : undefined}
          step={field.kind === "number" ? field.step : undefined}
          className={cn(FIELD, error && "border-danger")}
        />
      )}

      {error ? (
        <p role="alert" className="text-meta text-danger mt-1.5">
          {error}
        </p>
      ) : field.hint ? (
        <p className="text-meta text-ink-mute mt-1.5">{field.hint}</p>
      ) : null}
    </div>
  );
}
