"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { LyfeEvent } from "@/lib/types/domain";
import { formatDateTimeFR } from "@/lib/utils/format";

export function PromoteTab({ event }: { event: LyfeEvent }) {
  const [copied, setCopied] = useState(false);
  const url = `https://lyfe.ma/e/${event.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* === Public link + share === */}
      <Card variant="surface" size="md">
        <h3 className="text-h3 text-ink">Lien public</h3>
        <p className="text-meta text-ink-soft mt-1 mb-5">
          À partager sur tous vos canaux
        </p>
        <div className="flex bg-canvas-2/60 border border-line rounded-full overflow-hidden h-12 items-center pl-4">
          <span className="text-[13px] text-ink num truncate flex-1">
            {url}
          </span>
          <button
            onClick={copy}
            className="h-12 px-5 bg-ink text-canvas text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-ink-soft transition-colors"
          >
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <Check size={14} strokeWidth={2} />
                  Copié
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2"
                >
                  <Copy size={14} strokeWidth={1.8} />
                  Copier
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { name: "WhatsApp", color: "#25D366" },
            { name: "Instagram", color: "#E1306C" },
            { name: "Facebook", color: "#1877F2" },
            { name: "X", color: "#0F0F0F" },
          ].map((p) => (
            <button
              key={p.name}
              className="inline-flex items-center gap-2 h-10 px-4 text-[13px] font-semibold border border-line rounded-full hover:border-ink transition-colors"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: p.color }}
              />
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      {/* === Social card preview === */}
      <Card variant="canvas-2" size="md">
        <h3 className="text-h3 text-ink">Aperçu carte sociale</h3>
        <p className="text-meta text-ink-soft mt-1 mb-5">
          OpenGraph / WhatsApp / Instagram
        </p>
        <div
          className="aspect-[1.91/1] rounded-[var(--radius-md)] overflow-hidden relative"
          style={{
            background:
              "linear-gradient(135deg, var(--color-ink), var(--color-ink-soft))",
          }}
        >
          <div
            className="absolute -top-12 -right-8 w-72 h-72 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(134,91,166,0.42), transparent 70%)",
            }}
          />
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <div className="text-eyebrow text-violet">
              LYFE · {event.venue.city}
            </div>
            <div
              className="text-h2 text-canvas mt-1.5 leading-tight max-w-md"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {event.name}
            </div>
            <div className="text-meta text-canvas/70 mt-2 num">
              {formatDateTimeFR(event.startsAt)}
            </div>
          </div>
        </div>
      </Card>

      {/* === QR poster === */}
      <Card variant="surface" size="md">
        <h3 className="text-h3 text-ink">Affiche QR</h3>
        <p className="text-meta text-ink-soft mt-1 mb-5">
          PDF imprimable, prêt pour vos vitrines
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["A4", "A3"] as const).map((size) => (
            <button
              key={size}
              className="bg-canvas-2/60 border border-line rounded-[var(--radius-md)] p-4 hover:border-ink transition-colors text-left"
            >
              <div
                className="aspect-[1/1.414] rounded-[var(--radius-sm)] mb-3 flex items-center justify-center bg-surface"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 30%, rgba(10,31,61,0.05), transparent 60%)",
                }}
              >
                <QrSvg />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-ink">
                  Format {size}
                </span>
                <Download size={14} className="text-ink-mute" strokeWidth={1.8} />
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* === Embed === */}
      <Card variant="ink" size="md">
        <h3 className="text-h3 text-canvas">Code à intégrer</h3>
        <p className="text-meta text-canvas/60 mt-1 mb-4">
          Affichez la billetterie sur votre propre site
        </p>
        <pre className="text-[12px] bg-black/40 text-canvas/85 p-4 rounded-[var(--radius-sm)] overflow-x-auto scroll-thin num leading-relaxed">
          {`<iframe
  src="${url}/embed"
  width="100%"
  height="540"
  style="border:0">
</iframe>`}
        </pre>
      </Card>
    </div>
  );
}

// Mock QR, geometric placeholder. Real impl uses qrcode.react.
function QrSvg() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
      {/* Position markers */}
      {[
        [4, 4],
        [60, 4],
        [4, 60],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="16" height="16" fill="#0A1F3D" rx="2" />
          <rect x={x + 4} y={y + 4} width="8" height="8" fill="#FAF7F0" rx="1" />
          <rect x={x + 6} y={y + 6} width="4" height="4" fill="#0A1F3D" />
        </g>
      ))}
      {/* Random data dots */}
      {Array.from({ length: 32 }).map((_, i) => {
        const x = (i % 8) * 7 + 24;
        const y = Math.floor(i / 8) * 7 + 24;
        if ((i * 31) % 5 === 0) return null;
        return (
          <rect key={i} x={x} y={y} width="5" height="5" fill="#0A1F3D" />
        );
      })}
    </svg>
  );
}
