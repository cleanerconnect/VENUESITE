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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="num">
            <div className="text-[10px] uppercase tracking-badge text-muted">
              Avancement des scans
            </div>
            <div className="h-serif text-3xl text-ink mt-1">
              {scanned} / {total}
            </div>
            <div className="mt-2 max-w-xs">
              <ProgressBar value={scanned} max={total} tone="success" />
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Recherche manuelle" subtitle="Si la caméra ne fonctionne pas" />
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
            title="Scan hors ligne"
            subtitle="Téléchargez la liste signée pour une vérification sans réseau"
          />
          <Button variant="secondary" iconLeft={<IconDownload />}>
            Télécharger la liste
          </Button>
          <p className="text-xs text-muted mt-3">
            Synchronisation automatique des scans dès retour de la connexion.
          </p>
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-6 border-b border-line">
          <CardHeader title="Derniers scans" />
        </div>
        <ul className="divide-y divide-line">
          {MOCK_SCANS.map((s) => (
            <li
              key={s.code}
              className="px-6 py-3 flex items-center justify-between text-sm"
            >
              <div className="num text-ink">{s.code}</div>
              <div className="text-xs text-muted">
                par {s.staff} · {formatRelative(s.at)}
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
        <div className="aspect-square bg-ink/90 text-white flex items-center justify-center">
          <div className="text-center px-4">
            <IconScan width={40} height={40} />
            <p className="mt-3 text-sm">
              La caméra de l'appareil sera demandée ici.
            </p>
            <p className="text-xs opacity-70 mt-1">
              Centrer le QR du billet dans le cadre.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
