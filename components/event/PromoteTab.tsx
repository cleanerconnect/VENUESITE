"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconCopy, IconDownload } from "@/components/layout/icons";
import type { LyfeEvent } from "@/lib/types";

export function PromoteTab({ event }: { event: LyfeEvent }) {
  const [copied, setCopied] = useState(false);
  const url = `https://lyfe.ma/e/${event.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop in mock */
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <Card>
        <CardHeader
          title="Lien public"
          subtitle="À partager sur tous vos canaux"
        />
        <div className="flex bg-bg-soft border border-line rounded-md overflow-hidden">
          <input
            readOnly
            value={url}
            className="flex-1 h-11 px-3 bg-transparent text-sm text-ink num focus:outline-none"
          />
          <button
            onClick={copy}
            className="h-11 px-4 bg-ink text-white text-[13px] font-medium flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors"
            aria-label="Copier le lien"
          >
            <IconCopy />
            {copied ? "Copié" : "Copier"}
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
              className="inline-flex items-center gap-2 h-9 px-3 text-[13px] border border-line bg-surface rounded-md hover:bg-bg-soft transition-colors"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: p.color }}
              />
              {p.name}
            </button>
          ))}
        </div>
      </Card>

      <Card tone="hero">
        <CardHeader
          title="Aperçu carte sociale"
          subtitle="OpenGraph / WhatsApp / Instagram"
        />
        <div className="border border-line bg-surface aspect-[1.91/1] rounded-md flex flex-col justify-end p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-hero-warm opacity-90" />
          <div className="relative">
            <div className="eyebrow text-gold">
              LYFE · {event.venue.city}
            </div>
            <div className="h-display text-xl text-ink mt-1.5 leading-tight">
              {event.name}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Affiche QR"
          subtitle="PDF imprimable, prêt pour vos vitrines"
        />
        <div className="flex gap-2">
          <Button variant="secondary" iconLeft={<IconDownload />}>
            Format A4
          </Button>
          <Button variant="secondary" iconLeft={<IconDownload />}>
            Format A3
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Code à intégrer"
          subtitle="Affichez la billetterie sur votre propre site"
        />
        <pre className="text-[11px] bg-ink text-white/90 p-4 rounded-md overflow-x-auto scroll-thin num leading-relaxed">
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
