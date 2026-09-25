import "server-only";

// Driver selection.
//
// OPEN: the S3 driver is not written, because there is no bucket to write
// it against. When there is, it implements the same three methods —
// `createUploadTicket` returns a presigned PUT, `publicUrl` prefixes the
// CloudFront domain, `remove` issues a DeleteObject — and this function
// picks it. No caller changes, because no caller knows which one it has.

import type { StorageDriver } from "./types";
import { LocalStorageDriver } from "./local-driver";

let driver: StorageDriver | null = null;

export function storageDriver(): StorageDriver {
  driver ??= new LocalStorageDriver();
  return driver;
}

export function setStorageDriver(next: StorageDriver | null) {
  driver = next;
}

/** True once object storage is real rather than local disk. */
export function isRemoteStorage(): boolean {
  return Boolean(process.env.LYFE_S3_BUCKET && process.env.LYFE_CDN_DOMAIN);
}

export * from "./types";
