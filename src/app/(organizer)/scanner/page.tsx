"use client";

import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";

// Fullscreen scanner takeover (mobile bottom nav target). Section 4
// of the mobile redesign builds out the camera viewfinder, gate
// counters, and live ops; this is the route stub in place so
// navigation works in the meantime.
export default function ScannerPage() {
  return (
    <div className="fixed inset-0 z-40 bg-ink text-canvas flex flex-col">
      <header className="h-14 flex items-center px-4 border-b border-canvas/10">
        <Link
          href="/dashboard"
          aria-label="Retour"
          className="h-10 w-10 -ml-2 rounded-full hover:bg-canvas/10 flex items-center justify-center text-canvas transition-colors"
        >
          <ArrowLeft size={20} strokeWidth={1.7} />
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-canvas/60 ml-2">
          Scanner
        </span>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <span
          aria-hidden
          className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-canvas/10 mb-5"
        >
          <ScanLine size={28} strokeWidth={1.5} className="text-violet" />
        </span>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "clamp(28px, 4vw, 36px)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Scanner LYFE
        </h1>
        <p className="text-body text-canvas/65 mt-3 max-w-sm leading-relaxed">
          Le mode plein écran avec camera viewfinder, sélecteur d&apos;événement,
          et live counter arrive à la prochaine itération.
        </p>
      </main>
    </div>
  );
}
