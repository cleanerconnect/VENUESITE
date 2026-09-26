// A vignette is square, and the crop happens here rather than in the app.
//
// The app draws the venue's thumbnail in a square tile, so a 3:2
// photograph gets centre-cropped by whoever renders it — which means
// the partner picks a picture and finds out later which third of it
// their guests actually see, on a device they do not have. Cropping
// before the upload makes the stored object the thing the partner
// approved, and `thumbnail_url` a promise the payload can keep: the
// bytes behind it are square.
//
// Centre crop, not a crop UI. The second is a better product and a
// week of work; this is the honest version of the first — the picker
// shows the result immediately, so a bad centre is visible before the
// partner moves on rather than after their listing is live.

/** The longest edge worth storing for a tile that renders at 96px. */
export const THUMBNAIL_SIZE = 512;

/**
 * The largest centred square of `file`, re-encoded at `size`.
 *
 * Returns a `File`, not a `Blob`, because every caller goes on to hand
 * it to the same upload path, which reads `name` and `type`.
 *
 * Throws if the image cannot be decoded — an `image/*` content type is
 * a claim, not a fact, and a caller that swallowed this would upload
 * the original and store something that is not square.
 */
export async function cropToSquare(
  file: File,
  size: number = THUMBNAIL_SIZE,
): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("image_undecodable");

  const edge = Math.min(bitmap.width, bitmap.height);
  const sx = Math.round((bitmap.width - edge) / 2);
  const sy = Math.round((bitmap.height - edge) / 2);
  // Never upscale: a 200px logo blown up to 512 is a blurrier file that
  // is also four times heavier.
  const side = Math.min(size, edge);

  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, side, side);
  bitmap.close();

  // PNG, because a logo is the common case and a logo re-encoded as
  // JPEG picks up ringing around its own edges. The 2 MB ceiling on the
  // `logo` kind is generous for a 512px square either way.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("encode_failed");

  const base = file.name.replace(/\.[^.]+$/, "") || "vignette";
  return new File([blob], `${base}.png`, { type: "image/png" });
}
