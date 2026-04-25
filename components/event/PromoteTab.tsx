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
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader title="Lien public" subtitle="À partager sur tous vos canaux" />
        <div className="flex">
          <input
            readOnly
            value={url}
            className="flex-1 h-11 px-3 bg-bg border border-line text-sm text-ink num focus:outline-none"
          />
          <button
            onClick={copy}
            className="h-11 px-4 bg-ink text-white text-sm flex items-center gap-2"
            aria-label="Copier le lien"
          >
            <IconCopy />
            {copied ? "Copié" : "Copier"}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {["WhatsApp", "Instagram", "Facebook", "X"].map((p) => (
            <Button key={p} variant="secondary" size="sm">
              {p}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Aperçu carte sociale"
          subtitle="OpenGraph / WhatsApp / Instagram"
        />
        <div className="border border-line bg-bg aspect-[1.91/1] flex flex-col justify-end p-4">
          <div className="text-[10px] uppercase tracking-badge text-gold">
            LYFE · {event.venue.city}
          </div>
          <div className="h-display text-xl text-ink mt-1 leading-tight">
            {event.name}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="QR poster" subtitle="PDF imprimable A4 et A3" />
        <div className="flex gap-2">
          <Button variant="secondary" iconLeft={<IconDownload />}>
            Poster A4
          </Button>
          <Button variant="secondary" iconLeft={<IconDownload />}>
            Poster A3
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Code à intégrer"
          subtitle="Affichez la billetterie sur votre site"
        />
        <pre className="text-xs bg-bg border border-line p-3 overflow-x-auto scroll-thin num text-ink">
          {`<iframe src="${url}/embed"
        width="100%" height="540"
        style="border:0"></iframe>`}
        </pre>
      </Card>
    </div>
  );
}
