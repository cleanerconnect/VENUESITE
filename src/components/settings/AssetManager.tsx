"use client";

import { useRef, useState } from "react";
import { Reorder } from "motion/react";
import { GripVertical, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
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
  layout = "list",
  addLabel,
  publicBase = "/api/assets/",
  max,
}: {
  kind: AssetKind;
  title: string;
  description: string;
  initial: VenueAsset[];
  /**
   * `gallery` draws the photos as what they are: a cover and a set of
   * thumbnails. A filename and a size in kilobytes tell an owner nothing
   * about which picture is on their listing.
   */
  layout?: "list" | "gallery";
  addLabel?: string;
  publicBase?: string;
  /**
   * How many files this surface accepts. The carte is a PDF or a few
   * photographed pages, never a hundred, and the picker says so before
   * the partner picks rather than after. The server enforces the same
   * number — this one is a courtesy.
   */
  max?: number;
}) {
  const { toast } = useToast();
  const [assets, setAssets] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rule = ASSET_RULES[kind];

  const full = max !== undefined && assets.length >= max;

  const upload = async (file: File) => {
    if (full) {
      setError(`${max} fichiers au maximum. Retirez-en un pour en ajouter un autre.`);
      return;
    }
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

  const src = (asset: VenueAsset) => `${publicBase}${asset.objectKey}`;

  /** Promotes a photo to first, which is the cover everywhere else. */
  const makeCover = (asset: VenueAsset) =>
    commitOrder([asset, ...assets.filter((a) => a.id !== asset.id)]);

  const picker = (
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
  );

  const limits = (
    <span className="text-meta text-ink-mute">
      {rule.contentTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")} ·
      max {Math.round(rule.maxBytes / (1024 * 1024))} Mo
      {max !== undefined ? ` · ${assets.length} sur ${max}` : ""}
    </span>
  );

  if (layout === "gallery") {
    const [cover, ...rest] = assets;
    return (
      <Card variant="surface" size="md">
        <h2 className="text-h3 text-ink mb-1">{title}</h2>
        <p className="text-meta text-ink-mute mb-4">{description}</p>

        {assets.length === 0 ? (
          <p className="mb-4 rounded-[var(--radius-sm)] border border-dashed border-line px-4 py-3 text-body text-ink-soft">
            Aucune photo pour le moment. La première que vous ajoutez devient
            la couverture de votre fiche dans l&apos;application.
          </p>
        ) : null}

        {cover ? (
          <figure className="mb-4">
            <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-line bg-canvas-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src(cover)}
                alt="Photo de couverture"
                className="aspect-[16/9] w-full object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-meta font-semibold text-canvas">
                Couverture
              </span>
            </div>
            <figcaption className="mt-2 flex items-center justify-between gap-3">
              <span className="text-body text-ink-soft">
                C'est la photo que le client voit en premier.
              </span>
              <Button
                variant="ghost"
                onClick={() => remove(cover)}
                iconLeft={<Trash2 size={16} strokeWidth={1.9} />}
              >
                Retirer
              </Button>
            </figcaption>
          </figure>
        ) : null}

        <div
          className={cn(
            "grid gap-3",
            assets.length === 0
              ? "grid-cols-1 sm:max-w-[16rem]"
              : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          )}
        >
          {rest.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-[var(--radius-sm)] border border-line bg-canvas-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src(asset)}
                alt=""
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/80 px-1 py-1">
                <button
                  type="button"
                  onClick={() => makeCover(asset)}
                  className="inline-flex min-h-11 items-center gap-2 rounded px-2 text-meta font-semibold text-canvas hover:bg-canvas/15"
                >
                  <Star size={14} strokeWidth={2} aria-hidden />
                  Couverture
                </button>
                <button
                  type="button"
                  onClick={() => remove(asset)}
                  aria-label="Retirer cette photo"
                  className="inline-flex h-8 w-8 items-center justify-center rounded text-canvas hover:bg-canvas/15"
                >
                  <Trash2 size={15} strokeWidth={1.9} aria-hidden />
                </button>
              </div>
            </div>
          ))}

          {/* The add tile sits in the grid, at the size of a photo: the
              action and the things it produces read as one surface. */}
          <button
            type="button"
            disabled={uploading || full}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border-2 border-dashed border-line px-3 text-center text-body font-semibold text-ink transition-colors hover:border-ink disabled:opacity-55"
          >
            <ImagePlus size={24} strokeWidth={1.9} aria-hidden />
            {uploading ? "Envoi…" : (addLabel ?? "Ajouter une photo")}
          </button>
        </div>

        {picker}
        {error ? <p className="text-meta text-danger mt-3">{error}</p> : null}
        <p className="mt-3">{limits}</p>
      </Card>
    );
  }

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
              className="flex items-center gap-3 border border-line rounded-[var(--radius-sm)] p-2 bg-surface cursor-grab active:cursor-grabbing"
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
                <span className="h-11 w-16 rounded-[6px] bg-violet-soft text-violet-deep text-meta font-bold flex items-center justify-center shrink-0">
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
        {picker}
        <Button
          variant="secondary"
          disabled={uploading || full}
          onClick={() => inputRef.current?.click()}
          iconLeft={<Upload size={16} strokeWidth={1.9} />}
        >
          {uploading ? "Envoi…" : (addLabel ?? "Ajouter un fichier")}
        </Button>
        {limits}
      </div>
    </Card>
  );
}
