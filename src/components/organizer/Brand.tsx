import Image from "next/image";

// LYFE wordmark — the supplied artwork, matted out of its background.
//
// Two files, because the mark has two official cuts: the colour one for
// light surfaces (`/lyfe-logo.png`, 828×344) and the white one for dark
// ones (`/lyfe-logo-white.png`, 1416×616). Both carry a real alpha
// channel, so neither needs a blend mode to hide a background box — the
// JPG this replaced was white-boxed, and `mix-blend-mode: multiply` was
// the trick that stopped the box showing on tinted surfaces. A trick
// that only works where the surface is lighter than the mark, which is
// exactly why it could never serve the dark panel.
//
// The two cuts have different proportions, so the width is computed from
// whichever is being drawn rather than from one ratio for both.
const ART = {
  color: { src: "/lyfe-logo.png", ratio: 828 / 344 },
  white: { src: "/lyfe-logo-white.png", ratio: 1416 / 616 },
} as const;

export function Brand({
  height = 44,
  variant = "color",
}: {
  height?: number;
  variant?: "color" | "white";
}) {
  const art = ART[variant];
  return (
    <Image
      src={art.src}
      alt="LYFE"
      width={Math.round(height * art.ratio)}
      height={height}
      priority
      style={{ height, width: "auto", objectFit: "contain" }}
    />
  );
}
