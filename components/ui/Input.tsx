import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, suffix, className = "", id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-xs uppercase tracking-badge text-muted"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          ref={ref}
          className={[
            "w-full h-11 px-3 bg-surface border text-ink text-sm",
            "focus:outline-none focus:border-ink",
            error ? "border-error" : "border-line",
            suffix ? "pr-16" : "",
            className,
          ].join(" ")}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-err` : undefined}
          {...rest}
        />
        {suffix ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <span id={`${inputId}-err`} className="text-xs text-error">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, hint, error, className = "", id, ...rest }, ref) {
    const inputId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-xs uppercase tracking-badge text-muted"
          >
            {label}
          </label>
        ) : null}
        <textarea
          id={inputId}
          ref={ref}
          rows={5}
          className={[
            "w-full px-3 py-2 bg-surface border text-ink text-sm",
            "focus:outline-none focus:border-ink",
            error ? "border-error" : "border-line",
            className,
          ].join(" ")}
          {...rest}
        />
        {error ? (
          <span className="text-xs text-error">{error}</span>
        ) : hint ? (
          <span className="text-xs text-muted">{hint}</span>
        ) : null}
      </div>
    );
  },
);

export function Select({
  label,
  options,
  hint,
  ...rest
}: {
  label?: string;
  options: { value: string; label: string }[];
  hint?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label className="text-xs uppercase tracking-badge text-muted">
          {label}
        </label>
      ) : null}
      <select
        className="w-full h-11 px-3 bg-surface border border-line text-ink text-sm focus:outline-none focus:border-ink"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 text-left w-full"
    >
      <span
        className={[
          "mt-0.5 inline-flex h-6 w-10 shrink-0 border transition-colors",
          checked ? "bg-ink border-ink" : "bg-white border-line",
        ].join(" ")}
      >
        <span
          className={[
            "h-5 w-5 bg-white border border-line transition-transform",
            checked ? "translate-x-4 border-ink" : "translate-x-0",
          ].join(" ")}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span className="block text-xs text-muted mt-0.5">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
