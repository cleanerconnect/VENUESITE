import { NextRequest } from "next/server";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { assetRoot } from "@/lib/assets/local-driver";

// Local read endpoint — the stand-in for CloudFront.
//
// Under the S3 driver this route is unused: `publicUrl()` returns the CDN
// domain and the browser never comes here.

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const objectKey = key.join("/");

  // Path traversal guard: resolve, then prove the result is still inside
  // the asset root. A key of `../../etc/passwd` resolves outside it.
  const root = resolve(assetRoot());
  const path = resolve(join(root, normalize(objectKey)));
  if (!path.startsWith(root + "/")) {
    return new Response("Not found", { status: 404 });
  }
  if (!existsSync(path)) return new Response("Not found", { status: 404 });

  const stat = statSync(path);
  const stream = Readable.toWeb(
    createReadStream(path),
  ) as unknown as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
