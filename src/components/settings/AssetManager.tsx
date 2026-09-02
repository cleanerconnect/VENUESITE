"use client";

import { useRef, useState } from "react";
import { Reorder } from "motion/react";
import { GripVertical, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  confirmUpload,
  removeAsset,
  requestUpload,
  saveAssetOrder,
} from "@/app/actions/venue";
import {
  ASSET_RULES,
  describeAssetError,
  validateAsset,
  type AssetKind,
  type VenueAsset,
} from "@/lib/assets/types";

// Photos and menu files.
//
// The browser uploads directly to the ticket URL — a same-origin endpoint
// today, a presigned S3 URL later. Nothing in this component knows which,
// which is the point: the bytes never pass through the Next server on
// their way to storage.

export function AssetManager({
  kind,
  title,
  description,
  initial,
  publicBase = "/api/assets/",
}: {
  kind: AssetKind;
  title: string;
  description: string;
  initial: VenueAsset[];
  publicBase?: string;
}) {
  const { toast } = useToast();
  const [assets, setAssets] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rule = ASSET_RULES[kind];

  const upload = async (file: File) => {
    // Checked here so the user is told before the bytes leave; the server
    // checks again because this one is a courtesy.
    const problem = validateAsset(kind, file.type, file.size);
    if (problem) {
      setError(describeAssetError(problem));
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const ticket = await requestUpload({
        kind,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!ticket.ok) {
        setError(ticket.errors[0]?.message ?? ticket.message ?? "Envoi refusé.");
        return;
      }

      const put = await fetch(ticket.data.url, {
        method: ticket.data.method,
        headers: ticket.data.headers,
        body: file,
      });
      if (!put.ok) {
        setError("L'envoi du fichier a échoué. Rien n'a été enregistré.");
        return;
      }

      const saved = await confirmUpload({
        kind,
        objectKey: ticket.data.objectKey,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!saved.ok) {
        setError(saved.message ?? "Le fichier n'a pas pu être enregistré.");
        return;
      }
      setAssets(saved.data);
      toast({ tone: "success", title: "Fichier ajouté" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (asset: VenueAsset) => {
    const before = assets;
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    const result = await removeAsset(asset.id, kind);
    if (!result.ok) {
      setAssets(before);
      toast({ tone: "danger", title: "Suppression impossible" });
      return;
    }
    setAssets(result.data);
  };

  const commitOrder = async (next: VenueAsset[]) => {
    const before = assets;
    setAssets(next);
    const result = await saveAssetOrder(kind, next.map((a) => a.id));
    if (!result.ok) {
      setAssets(before);
      toast({ tone: "danger", title: "Ordre non enregistré" });
      return;
    }
    setAssets(result.data);
  };

  return (
    <Card variant="surface" size="md">
      <h2 className="text-h3 text-ink mb-1">{title}</h2>
      <p className="text-meta text-ink-mute mb-4">{description}</p>

      {assets.length === 0 ? (
        <p className="text-meta text-ink-mute border border-dashed border-line rounded-[var(--radius-sm)] py-8 text-center mb-4">
          Aucun fichier pour le moment.
        </p>
      ) : (
        <Reorder.Group
          axis="y"
          values={assets}
          onReorder={setAssets}
          className="flex flex-col gap-2 mb-4 list-none p-0"
        >
          {assets.map((asset) => (
            <Reorder.Item
              key={asset.id}
              value={asset}
              onDragEnd={() => commitOrder(assets)}
              className="flex items-center gap-3 border border-line rounded-[var(--radius-sm)] p-2.5 bg-surface cursor-grab active:cursor-grabbing"
            >
              <GripVertical size={16} className="text-ink-mute shrink-0" aria-hidden />
              {asset.contentType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${publicBase}${asset.objectKey}`}
                  alt=""
                  className="h-11 w-16 object-cover rounded-[6px] bg-canvas-2 shrink-0"
                />
              ) : (
                <span className="h-11 w-16 rounded-[6px] bg-violet-soft text-violet-deep text-[10px] font-bold flex items-center justify-center shrink-0">
                  {asset.contentType.split("/")[1]?.toUpperCase().slice(0, 4)}
                </span>
              )}
              <span className="flex-1 min-w-0 text-meta text-ink-soft truncate num">
                {asset.objectKey.split("/").pop()} · {Math.round(asset.sizeBytes / 1024)} Ko
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(asset)}
                aria-label="Supprimer"
              >
                <Trash2 size={14} strokeWidth={1.9} />
              </Button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {error ? <p className="text-meta text-danger mb-3">{error}</p> : null}

      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={rule.contentTypes.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          iconLeft={<Upload size={14} strokeWidth={1.9} />}
        >
          {uploading ? "Envoi…" : "Ajouter un fichier"}
        </Button>
        <span className="text-meta text-ink-mute">
          {rule.contentTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")} ·
          max {Math.round(rule.maxBytes / (1024 * 1024))} Mo
        </span>
      </div>
    </Card>
  );
}
