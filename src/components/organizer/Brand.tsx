import Image from "next/image";

// LYFE wordmark. The wordmark IS the brand — no accompanying "LYFE" text
// label. Production artwork lives at /public/lyfe-logo.svg (full colour)
// and /public/lyfe-logo-white.svg (single-colour for dark surfaces).
export function Brand({
  height = 28,
  variant = "color",
}: {
  height?: number;
  variant?: "color" | "white";
}) {
  const src = variant === "white" ? "/lyfe-logo-white.svg" : "/lyfe-logo.svg";
  // Aspect ratio matches the SVG viewBox 168×56.
  const width = Math.round((height * 168) / 56);
  return (
    <Image
      src={src}
      alt="LYFE"
      width={width}
      height={height}
      priority
      style={{ height, width: "auto" }}
    />
  );
}
