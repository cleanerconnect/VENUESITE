"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { confirmUpload, removeAsset, requestUpload } from "@/app/actions/venue";
import { cropToSquare } from "@/lib/assets/square";
import {
  ASSET_RULES,
  describeAssetError,
  validateAsset,
  type VenueAsset,
} from "@/lib/assets/types";

// The vignette: one square picture, and the app's tile for this venue.
//
// Not the `AssetManager`, on purpose. That component is a list in an
// order — a cover and its spares, a carte and its pages — and every
// affordance it has is about which of several comes first. A vignette
// is exactly one, so a reorder handle, a « Couverture » button and a
// count of « 1 sur 10 » would all be answers to questions this surface
// does not ask.
//
// It is square before it is uploaded (`cropToSquare`), so the tile the
// partner approves here is the tile a guest sees, and `thumbnail_url`
// in the payload is square by construction rather than by convention.

const KIND = "logo" as const;

export function ThumbnailUpload({
  initial,
  publicBase = "/api/assets/",
}: {
  initial: VenueAsset[];
  publicBase?: string;
}) {
  const { toast } = useToast();
  const [asset, setAsset] = useState<VenueAsset | null>(initial[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rule = ASSET_RULES[KIND];

  const upload = async (picked: File) => {
    setError(null);
    setBusy(true);
    try {
      // Cropped first, then validated: the ceiling and the accepted
      // types are rules about what gets stored, and what gets stored is
      // the square PNG, not the 6 MB photograph it came out of.
      let file: File;
      try {
        file = await cropToSquare(picked);
      } catch {
        setError("Ce fichier n'a pas pu être lu comme une image.");
        return;
      }

      const problem = validateAsset(KIND, file.type, file.size);
      if (problem) {
        setError(describeAssetError(problem));
        return;
      }

      const ticket = await requestUpload({
        kind: KIND,
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
        kind: KIND,
        objectKey: ticket.data.objectKey,
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!saved.ok) {
        setError(saved.message ?? "La vignette n'a pas pu être enregistrée.");
        return;
      }
      // One vignette: the newest is the one, and the server keeps the
      // rest of the list in case a driver ever returns more than it was
      // sent.
      setAsset(saved.data[saved.data.length - 1] ?? null);
      toast({ tone: "success", title: "Vignette enregistrée" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = async () => {
    if (!asset) return;
    const before = asset;
    setAsset(null);
    const result = await removeAsset(asset.id, KIND);
    if (!result.ok) {
      setAsset(before);
      toast({ tone: "danger", title: "Suppression impossible" });
      return;
    }
    setAsset(result.data[result.data.length - 1] ?? null);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={rule.contentTypes.join(",")}
        aria-label="Vignette"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />

      <div className="flex items-start gap-4">
        {/* The tile at the size it is drawn in, not a preview of it:
            96px is what the app's list gives this picture, and a logo
            that is unreadable there is a logo the partner should see
            is unreadable here. */}
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-line bg-canvas-2">
          {asset ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`${publicBase}${asset.objectKey}`}
              alt="Vignette de l'établissement"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-ink-mute">
              <ImagePlus size={22} strokeWidth={1.6} aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p data-prose className="text-body text-ink-soft max-w-[62ch]">
            Votre logo, ou une photo carrée. L&apos;application l&apos;affiche
            dans un carré&nbsp;: la vôtre est recadrée au centre avant
            l&apos;envoi, et l&apos;aperçu ci-contre est le résultat.
          </p>
          <p className="text-meta text-ink-mute mt-1">
            {rule.contentTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")} ·
            max {Math.round(rule.maxBytes / (1024 * 1024))} Mo
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              iconLeft={<ImagePlus size={16} strokeWidth={1.9} />}
            >
              {busy ? "Envoi…" : asset ? "Remplacer" : "Ajouter une vignette"}
            </Button>
            {asset ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={clear}
                iconLeft={<Trash2 size={16} strokeWidth={1.9} />}
              >
                Retirer
              </Button>
            ) : null}
          </div>
          {error ? (
            <p className="mt-2 text-meta text-danger">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
