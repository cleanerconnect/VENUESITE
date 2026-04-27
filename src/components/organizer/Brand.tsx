import Image from "next/image";

// LYFE wordmark. The wordmark IS the brand — no accompanying "LYFE" text
// label. Production artwork lives at /public/lyfe-logo.svg (full colour)
// and /public/lyfe-logo-white.svg (single-colour for dark surfaces).
//
// Sizing: minimum 40px height. The y's vertical extent is roughly 1.7× cap
// height; below 40px the descender + purple ascender start to clip
// visually. Width auto-derives from the 240×80 viewBox aspect ratio.
export function Brand({
  height = 44,
  variant = "color",
}: {
  height?: number;
  variant?: "color" | "white";
}) {
  const src = variant === "white" ? "/lyfe-logo-white.svg" : "/lyfe-logo.svg";
  // 240/80 aspect — width follows height naturally with objectFit: contain.
  const width = Math.round((height * 240) / 80);
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
      }}
    />
  );
}
