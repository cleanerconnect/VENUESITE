import Image from "next/image";

// LYFE wordmark — production artwork lives at /public/lyfe-logo.jpg
// (954×522, 1.83:1). The JPG has a white background which blends into
// the canvas (#FFFFFF) seamlessly. White-variant SVG kept for any future
// dark-surface usage.
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
      }}
    />
  );
}
