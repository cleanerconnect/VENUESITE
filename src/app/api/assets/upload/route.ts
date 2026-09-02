import { NextRequest } from "next/server";
import { verifyTicket, writeLocalObject } from "@/lib/assets/local-driver";
import { validateAsset, type AssetKind } from "@/lib/assets/types";

// Local upload endpoint — the stand-in for a presigned S3 PUT.
//
// It exists only for the local driver. When the S3 driver is in use the
// browser PUTs straight to the bucket and never reaches this route, which
// is why nothing here is on the read path.
//
// The ticket is signed, so this endpoint will not accept a key a caller
// invented, and will not accept a size or type other than the one the
// ticket was issued for. An unsigned version of this route would be a
// public write endpoint.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const objectKey = url.searchParams.get("key");
  const expiresAt = url.searchParams.get("exp");
  const signature = url.searchParams.get("sig");
  const contentType = request.headers.get("content-type") ?? "";

  if (!objectKey || !expiresAt || !signature) {
    return Response.json({ error: "malformed_ticket" }, { status: 400 });
  }
  if (Date.parse(expiresAt) < Date.now()) {
    return Response.json({ error: "ticket_expired" }, { status: 410 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  const payload = `${objectKey}|${contentType}|${bytes.byteLength}|${expiresAt}`;
  if (!verifyTicket(payload, signature)) {
    // A mismatch means the key, type or size differs from what was
    // authorised — including a body larger than declared.
    return Response.json({ error: "invalid_ticket" }, { status: 403 });
  }

  // The kind is recoverable from the key the ticket authorised, so the
  // server re-runs the same validation the client did.
  const kind = objectKey.split("/")[2] as AssetKind;
  const invalid = validateAsset(kind, contentType, bytes.byteLength);
  if (invalid) {
    return Response.json({ error: invalid.code }, { status: 422 });
  }

  await writeLocalObject(objectKey, bytes);
  return Response.json({ objectKey, sizeBytes: bytes.byteLength });
}
