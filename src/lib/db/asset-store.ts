import "server-only";

// Asset rows. Venue-scoped like every other query here.

import { randomUUID } from "node:crypto";
import type { AssetKind, VenueAsset } from "@/lib/assets/types";
import { all, one, run, transaction } from "./store";

function rowToAsset(r: Record<string, string | number | null>): VenueAsset {
  return {
    id: String(r.id),
    venueId: String(r.venue_id),
    kind: String(r.kind) as AssetKind,
    objectKey: String(r.object_key),
    contentType: String(r.content_type),
    sizeBytes: Number(r.size_bytes),
    position: Number(r.position),
    createdAt: String(r.created_at),
  };
}

export function listAssets(venueId: string, kind?: AssetKind): VenueAsset[] {
  const rows = kind
    ? all(
        "SELECT * FROM venue_assets WHERE venue_id = ? AND kind = ? ORDER BY position, created_at",
        venueId,
        kind,
      )
    : all(
        "SELECT * FROM venue_assets WHERE venue_id = ? ORDER BY kind, position, created_at",
        venueId,
      );
  return rows.map(rowToAsset);
}

export function recordAsset(input: {
  venueId: string;
  kind: AssetKind;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
}): VenueAsset {
  const id = `ast_${randomUUID().slice(0, 12)}`;
  // Appends to the end of its kind, so an upload never displaces the
  // ordering a venue has already arranged.
  const next = one(
    "SELECT COALESCE(MAX(position), -1) + 1 AS p FROM venue_assets WHERE venue_id = ? AND kind = ?",
    input.venueId,
    input.kind,
  );

  run(
    `INSERT INTO venue_assets
       (id, venue_id, kind, object_key, content_type, size_bytes, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.venueId,
    input.kind,
    input.objectKey,
    input.contentType,
    input.sizeBytes,
    Number(next?.p ?? 0),
    new Date().toISOString(),
  );

  return {
    id,
    venueId: input.venueId,
    kind: input.kind,
    objectKey: input.objectKey,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    position: Number(next?.p ?? 0),
    createdAt: new Date().toISOString(),
  };
}

export function getAsset(venueId: string, id: string): VenueAsset | null {
  const r = one(
    "SELECT * FROM venue_assets WHERE id = ? AND venue_id = ?",
    id,
    venueId,
  );
  return r ? rowToAsset(r) : null;
}

export function deleteAsset(venueId: string, id: string): VenueAsset | null {
  const asset = getAsset(venueId, id);
  if (!asset) return null;
  run("DELETE FROM venue_assets WHERE id = ? AND venue_id = ?", id, venueId);
  return asset;
}

/**
 * Rewrites the order of one kind from a list of ids.
 *
 * Takes the whole list rather than a move instruction: a partial reorder
 * would leave positions to be reconciled against what the client thought
 * it had, and drag-and-drop already knows the final order.
 */
export function reorderAssets(
  venueId: string,
  kind: AssetKind,
  orderedIds: string[],
): VenueAsset[] {
  transaction(() => {
    orderedIds.forEach((id, index) => {
      run(
        "UPDATE venue_assets SET position = ? WHERE id = ? AND venue_id = ? AND kind = ?",
        index,
        id,
        venueId,
        kind,
      );
    });
  });
  return listAssets(venueId, kind);
}
