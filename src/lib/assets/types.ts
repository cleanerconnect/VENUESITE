// Asset model.
//
// The portal stores an S3 **object key**, never a URL, so the CDN domain
// can change without a migration. Reads go through whatever the driver
// says is the public base; writes go through a short-lived upload ticket
// the driver issues.
//
// That indirection is the whole design: the local driver writes to disk
// and hands back a same-origin PUT endpoint, the S3 driver hands back a
// presigned URL. Callers see one shape and never learn which is running.

export type AssetKind = "cover" | "photo" | "logo" | "menu_file" | "export" | "qr";

export interface VenueAsset {
  id: string;
  venueId: string;
  kind: AssetKind;
  /** The stored key. Never a URL. */
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  position: number;
  createdAt: string;
}

/** What the browser needs to perform the upload itself. */
export interface UploadTicket {
  /** Where to PUT the bytes. Presigned S3 URL, or a local endpoint. */
  url: string;
  method: "PUT" | "POST";
  headers: Record<string, string>;
  /** The key the caller must record once the PUT succeeds. */
  objectKey: string;
  expiresAt: string;
}

export interface StorageDriver {
  /** Issues a short-lived ticket for a single object. */
  createUploadTicket(input: {
    venueId: string;
    kind: AssetKind;
    filename: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<UploadTicket>;

  /** Resolves a stored key to something a browser can load. */
  publicUrl(objectKey: string): string;

  /** Removes the object. Called after the row is deleted, never before. */
  remove(objectKey: string): Promise<void>;
}

// ── Validation ───────────────────────────────────────────────

export const ASSET_RULES: Record<
  AssetKind,
  { maxBytes: number; contentTypes: string[]; label: string }
> = {
  cover: {
    maxBytes: 8 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    label: "Photo de couverture",
  },
  photo: {
    maxBytes: 8 * 1024 * 1024,
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    label: "Photo",
  },
  logo: {
    maxBytes: 2 * 1024 * 1024,
    contentTypes: ["image/png", "image/svg+xml", "image/webp"],
    label: "Logo",
  },
  menu_file: {
    maxBytes: 20 * 1024 * 1024,
    contentTypes: ["application/pdf", "image/jpeg", "image/png"],
    label: "Carte",
  },
  export: {
    maxBytes: 50 * 1024 * 1024,
    contentTypes: ["text/csv", "application/pdf"],
    label: "Export",
  },
  qr: {
    maxBytes: 1024 * 1024,
    contentTypes: ["image/png", "image/svg+xml"],
    label: "QR",
  },
};

export type AssetValidationError =
  | { code: "type_not_allowed"; allowed: string[] }
  | { code: "too_large"; maxBytes: number }
  | { code: "empty" };

/**
 * Validated on both sides. The client checks so the user gets an answer
 * before uploading eight megabytes; the server checks because a client
 * check is a courtesy, not a control.
 */
export function validateAsset(
  kind: AssetKind,
  contentType: string,
  sizeBytes: number,
): AssetValidationError | null {
  const rule = ASSET_RULES[kind];
  if (sizeBytes <= 0) return { code: "empty" };
  if (!rule.contentTypes.includes(contentType)) {
    return { code: "type_not_allowed", allowed: rule.contentTypes };
  }
  if (sizeBytes > rule.maxBytes) {
    return { code: "too_large", maxBytes: rule.maxBytes };
  }
  return null;
}

export function describeAssetError(error: AssetValidationError): string {
  switch (error.code) {
    case "empty":
      return "Le fichier est vide.";
    case "too_large":
      return `Fichier trop lourd — maximum ${Math.round(error.maxBytes / (1024 * 1024))} Mo.`;
    case "type_not_allowed":
      return `Format non accepté. Formats acceptés : ${error.allowed
        .map((t) => t.split("/")[1].toUpperCase())
        .join(", ")}.`;
  }
}
