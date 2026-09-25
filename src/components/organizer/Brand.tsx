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

/**
 * Two sizes, and the clear space each one asks for.
 *
 * The mark shipped at eight call sites in six different heights — 26,
 * 26, 28, 32, 40, 44, 44, 56 — because every call site passed a number
 * that looked right there. Six sizes of one logo is six logos to the
 * eye, and the four places the audit names (Connexion, Inscription, the
 * sidebar, the phone header) showed three of them.
 *
 * So a caller names a context instead of a number:
 *
 *   `lg` (40px)  a surface whose subject is the mark: the sidebar
 *                header, Connexion, Inscription, a printed cover.
 *   `sm` (28px)  a bar that carries the mark among other things: the
 *                phone header, the mobile drawer.
 *
 * And the clear space is one rule, not a per-site judgement: **24px
 * around the large mark, 16px around the small one** — both on the
 * spacing scale, and both wider than the mark's own cap height, which
 * is what keeps the descender of the "y" off whatever sits under it.
 * The rule lives here in words because it is applied by the four
 * callers' padding, and a rule stated at only one of four call sites
 * is how the six heights happened.
 */
const HEIGHT = { lg: 40, sm: 28 } as const;

export function Brand({
  size = "lg",
  variant = "color",
}: {
  size?: "lg" | "sm";
  variant?: "color" | "white";
}) {
  const height = HEIGHT[size];
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
