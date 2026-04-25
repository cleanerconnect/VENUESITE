"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-surface border border-line shadow-card max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h3 className="h-serif text-lg text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink text-xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer ? (
          <div className="px-5 py-4 border-t border-line flex justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
