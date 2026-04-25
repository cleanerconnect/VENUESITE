import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, suffix, prefix, className = "", id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="eyebrow">
          {label}
        </label>
      ) : null}
      <div
        className={[
          "relative flex items-center bg-surface border rounded-md transition-all duration-150",
          "focus-within:border-ink focus-within:shadow-focus",
          error ? "border-error/60" : "border-line",
        ].join(" ")}
      >
        {prefix ? (
          <span className="pl-3 text-muted text-sm">{prefix}</span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={[
            "flex-1 h-11 px-3 bg-transparent text-ink text-sm outline-none placeholder:text-muted-2",
            suffix ? "pr-2" : "",
            className,
          ].join(" ")}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-err` : undefined}
          {...rest}
        />
        {suffix ? (
          <span className="pr-3 text-xs text-muted shrink-0">{suffix}</span>
        ) : null}
      </div>
      {error ? (
        <span
          id={`${inputId}-err`}
          className="text-xs text-error flex items-start gap-1.5 mt-0.5"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 4v3M6 8.5v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
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
          <label htmlFor={inputId} className="eyebrow">
            {label}
          </label>
        ) : null}
        <textarea
          id={inputId}
          ref={ref}
          rows={5}
          className={[
            "w-full px-3 py-2.5 bg-surface border rounded-md text-ink text-sm outline-none transition-all duration-150 resize-y",
            "focus:border-ink focus:shadow-focus placeholder:text-muted-2",
            error ? "border-error/60" : "border-line",
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
      {label ? <label className="eyebrow">{label}</label> : null}
      <select
        className="w-full h-11 px-3 bg-surface border border-line rounded-md text-ink text-sm focus:outline-none focus:border-ink focus:shadow-focus transition-all duration-150"
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
      className="flex items-start gap-3 text-left w-full group"
    >
      <span
        className={[
          "mt-0.5 inline-flex h-[22px] w-9 shrink-0 rounded-full p-0.5 transition-colors duration-200 ease-out-expo",
          checked
            ? "bg-ink"
            : "bg-line-strong/60 group-hover:bg-line-strong",
        ].join(" ")}
      >
        <span
          className={[
            "h-[18px] w-[18px] bg-white rounded-full shadow-[0_1px_2px_rgba(15,15,15,0.25)] transition-transform duration-200 ease-out-expo",
            checked ? "translate-x-[14px]" : "translate-x-0",
          ].join(" ")}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span className="block text-[13px] text-muted mt-0.5 leading-relaxed">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
