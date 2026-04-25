"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { IconDownload, IconScan } from "@/components/layout/icons";
import { formatRelative } from "@/lib/format";

const MOCK_SCANS = [
  { code: "LYFE-7821-AC9D", staff: "Hamza", at: new Date(Date.now() - 30_000).toISOString() },
  { code: "LYFE-7821-7H2K", staff: "Hamza", at: new Date(Date.now() - 90_000).toISOString() },
  { code: "LYFE-7821-2V8L", staff: "Imane", at: new Date(Date.now() - 240_000).toISOString() },
];

export function ScannerTab() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const scanned = 247;
  const total = 500;
  const pct = Math.round((scanned / total) * 100);

  return (
    <div className="flex flex-col gap-5">
      <Card tone="royal">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="num">
            <div className="eyebrow text-muted-2">Avancement des scans</div>
            <div className="flex items-baseline gap-3 mt-2">
              <div className="h-hero text-[40px] text-ink">{scanned}</div>
              <div className="text-muted text-lg num">/ {total}</div>
              <div className="ml-2 chip">{pct}%</div>
            </div>
            <div className="mt-3 max-w-sm">
              <ProgressBar value={scanned} max={total} tone="success" />
            </div>
            <div className="text-[12px] text-muted mt-2">
              Encore {total - scanned} billets à scanner
            </div>
          </div>
          <Button
            size="lg"
            iconLeft={<IconScan />}
            onClick={() => setOpen(true)}
          >
            Lancer le scanner
          </Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Recherche manuelle"
            subtitle="Si la caméra est indisponible, saisissez le code à 8 caractères"
          />
          <Input
            label="Code billet"
            placeholder="LYFE-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <div className="mt-4">
            <Button size="md" disabled={code.length < 6}>
              Vérifier le billet
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Mode hors ligne"
            subtitle="Téléchargez la liste signée pour scanner sans réseau"
          />
          <Button variant="secondary" iconLeft={<IconDownload />}>
            Télécharger la liste
          </Button>
          <p className="text-[12px] text-muted mt-3 leading-relaxed">
            Synchronisation automatique des scans dès retour de la connexion.
            Les doublons sont gérés côté serveur.
          </p>
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-6 pt-6 pb-5 border-b border-line">
          <CardHeader
            title="Derniers scans"
            subtitle="Mises à jour en direct"
            action={<span className="live-dot" />}
          />
        </div>
        <ul className="divide-y divide-line">
          {MOCK_SCANS.map((s) => (
            <li
              key={s.code}
              className="px-6 py-3.5 flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-success/10 text-success">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="m4 7.5 2 2 4-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <div className="num text-ink font-medium">{s.code}</div>
                  <div className="text-[11px] text-muted">par {s.staff}</div>
                </div>
              </div>
              <div className="text-[12px] text-muted num">
                {formatRelative(s.at)}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Scanner — caméra"
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        }
      >
        <div className="aspect-square bg-gradient-to-br from-ink to-[#1a1a1a] rounded-md text-white flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-8 border-2 border-white/40 rounded-md">
            <div className="absolute -top-px -left-px h-6 w-6 border-t-2 border-l-2 border-gold" />
            <div className="absolute -top-px -right-px h-6 w-6 border-t-2 border-r-2 border-gold" />
            <div className="absolute -bottom-px -left-px h-6 w-6 border-b-2 border-l-2 border-gold" />
            <div className="absolute -bottom-px -right-px h-6 w-6 border-b-2 border-r-2 border-gold" />
          </div>
          <div className="text-center px-4 relative">
            <IconScan width={36} height={36} />
            <p className="mt-3 text-sm">
              Centrer le QR du billet dans le cadre
            </p>
            <p className="text-[11px] opacity-60 mt-1">
              Permission caméra demandée à l'ouverture
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
