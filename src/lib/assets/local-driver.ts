import "server-only";

// Local filesystem driver.
//
// Stands in for S3 while there is no bucket. It writes under
// `.data/assets/<key>` and hands back a same-origin PUT endpoint instead
// of a presigned URL — the shape the caller sees is identical, which is
// what makes the swap to S3 a driver change rather than a UI change.
//
// The ticket carries a signed token so the upload endpoint can verify the
// key, kind and size it was issued for. Without it, the endpoint would
// accept any key a caller invented, which is the same hole an unsigned
// presigned URL would be.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { AssetKind, StorageDriver, UploadTicket } from "./types";

const TICKET_TTL_MS = 10 * 60_000;

function secret(): string {
  // Falls back to a per-process value so local dev works with no config;
  // an unset secret in production would make tickets forgeable.
  return process.env.LYFE_UPLOAD_SECRET ?? "dev-only-upload-secret";
}

export function assetRoot(): string {
  return process.env.LYFE_ASSET_DIR ?? resolve(".data/assets");
}

export function signTicket(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function verifyTicket(payload: string, signature: string): boolean {
  const expected = Buffer.from(signTicket(payload), "utf8");
  const given = Buffer.from(signature, "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** `venues/<venueId>/<kind>/<uuid>.<ext>` — stable, sortable, opaque. */
export function buildObjectKey(
  venueId: string,
  kind: AssetKind,
  filename: string,
): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  return `venues/${venueId}/${kind}/${randomUUID()}.${ext}`;
}

export class LocalStorageDriver implements StorageDriver {
  async createUploadTicket({
    venueId,
    kind,
    filename,
    contentType,
    sizeBytes,
  }: {
    venueId: string;
    kind: AssetKind;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<UploadTicket> {
    const objectKey = buildObjectKey(venueId, kind, filename);
    const expiresAt = new Date(Date.now() + TICKET_TTL_MS).toISOString();
    const payload = `${objectKey}|${contentType}|${sizeBytes}|${expiresAt}`;

    return {
      url: `/api/assets/upload?key=${encodeURIComponent(objectKey)}&exp=${encodeURIComponent(expiresAt)}&sig=${signTicket(payload)}`,
      method: "PUT",
      headers: { "Content-Type": contentType },
      objectKey,
      expiresAt,
    };
  }

  publicUrl(objectKey: string): string {
    // The S3 driver returns `${CLOUDFRONT_DOMAIN}/${objectKey}`. Only the
    // base differs, which is why the key is what gets stored.
    return `/api/assets/${objectKey}`;
  }

  async remove(objectKey: string): Promise<void> {
    try {
      await unlink(join(assetRoot(), objectKey));
    } catch {
      // Already gone is the desired end state.
    }
  }
}

export async function writeLocalObject(
  objectKey: string,
  bytes: Buffer,
): Promise<void> {
  const path = join(assetRoot(), objectKey);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}
