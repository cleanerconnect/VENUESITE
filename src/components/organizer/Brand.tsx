import Image from "next/image";

// LYFE wordmark — production artwork lives at /public/lyfe-logo.jpg
// (954×522, 1.83:1). The JPG carries a white background; on tinted /
// non-white surfaces (canvas-2 sidebar, violet washes), that background
// shows up as a faint clipping rectangle. mix-blend-mode: multiply
// solves it cleanly: white pixels (#FFFFFF) multiply to whatever sits
// behind them, so they read as transparent against any surface that
// isn't pure white. On pure-white surfaces (canvas, surface) the blend
// is a no-op.
//
// On dark surfaces multiply would make the logo disappear entirely —
// for those, pass variant="white" to swap to the pre-rendered
// transparent SVG.
export function Brand({
  height = 44,
  variant = "color",
}: {
  height?: number;
  variant?: "color" | "white";
}) {
  const src =
    variant === "white" ? "/lyfe-logo-white.svg" : "/lyfe-logo.jpg";
  // Match the JPG's actual aspect ratio, 954/522.
  const width = Math.round((height * 954) / 522);
  return (
    <Image
      src={src}
      alt="LYFE"
      width={width}
      height={height}
      priority
      style={{
        height,
        width: "auto",
        objectFit: "contain",
        background: "transparent",
        mixBlendMode: variant === "color" ? "multiply" : undefined,
      }}
    />
  );
}
