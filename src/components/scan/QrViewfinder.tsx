"use client";

// The camera viewfinder.
//
// Presentational: it takes a scanner and renders it. Both door surfaces
// — the event scanner and the venue check-in sheet — use this one, so a
// host who works a festival on Friday and a restaurant on Saturday
// meets the same thing twice.
//
// Every non-scanning state names what is wrong and what to do, because
// the answer differs: a refused permission is retried, a missing camera
// is not, and an insecure origin is a deploy problem the host cannot
// fix. Manual entry sits beside this in all of them.
//
// Dark by default — both surfaces are dark, and a white panel in a dark
// venue blinds the person holding the phone.

import { Camera, CameraOff, Lock, RotateCw, TriangleAlert } from "lucide-react";
import type { QrScanner } from "@/lib/scan/useQrScanner";
import { cn } from "@/lib/utils/cn";

const MESSAGE: Record<
  Exclude<QrScanner["status"], "scanning">,
  { title: string; body: string; retry: boolean }
> = {
  idle: {
    title: "Caméra en veille",
    body: "Activez la caméra pour scanner les billets.",
    retry: true,
  },
  starting: {
    title: "Ouverture de la caméra…",
    body: "Autorisez l'accès si votre navigateur le demande.",
    retry: false,
  },
  denied: {
    title: "Accès à la caméra refusé",
    body: "Autorisez la caméra dans les réglages du navigateur, ou saisissez le code à la main.",
    retry: true,
  },
  no_camera: {
    title: "Aucune caméra disponible",
    body: "Cet appareil n'expose pas de caméra. La saisie manuelle fonctionne.",
    retry: false,
  },
  insecure: {
    title: "Caméra indisponible sur cette connexion",
    body: "Le navigateur n'autorise la caméra qu'en HTTPS. Saisissez le code à la main.",
    retry: false,
  },
  error: {
    title: "La caméra n'a pas démarré",
    body: "Réessayez, ou saisissez le code à la main.",
    retry: true,
  },
};

export function QrViewfinder({
  scanner,
  /** Shown under the frame while scanning — e.g. "Billet · Jazzablanca". */
  hint,
  className,
}: {
  scanner: QrScanner;
  hint?: string;
  className?: string;
}) {
  const { status, videoRef, decoder, start } = scanner;
  const scanning = status === "scanning";

  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] bg-ink",
        className,
      )}
    >
      {/* Always mounted: the hook attaches the stream to it before the
          status flips, and a video that mounts late misses the frame. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Aperçu de la caméra"
        className={cn(
          "h-full w-full object-cover transition-opacity duration-200",
          scanning ? "opacity-100" : "opacity-0",
        )}
      />

      {scanning ? (
        <>
          {/* Reticle. Corners only — a full box hides what is being aimed at. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[62%] aspect-square">
              {[
                "top-0 left-0 border-t-2 border-l-2 rounded-tl-[var(--radius-sm)]",
                "top-0 right-0 border-t-2 border-r-2 rounded-tr-[var(--radius-sm)]",
                "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[var(--radius-sm)]",
                "bottom-0 right-0 border-b-2 border-r-2 rounded-br-[var(--radius-sm)]",
              ].map((corner) => (
                <span
                  key={corner}
                  className={cn("absolute h-7 w-7 border-violet", corner)}
                />
              ))}
            </div>
          </div>

          <div
            role="status"
            className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-ink/70 px-3 py-2 backdrop-blur-sm"
          >
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-on-ink">
              <Camera size={13} strokeWidth={2} className="text-violet-on-ink" />
              {hint ?? "Visez le QR code"}
            </span>
            {/* Which decoder is live. Cheap to show, and the first thing
                worth knowing when a scan fails on one device only. */}
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-ink/50">
              {decoder === "native" ? "natif" : decoder === "bundled" ? "intégré" : ""}
            </span>
          </div>
        </>
      ) : (
        <div
          role={status === "starting" ? "status" : "alert"}
          aria-live="polite"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
        >
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-full bg-on-ink/10"
          >
            {status === "denied" ? (
              <Lock size={18} strokeWidth={1.8} className="text-on-ink/70" />
            ) : status === "no_camera" || status === "insecure" ? (
              <CameraOff size={18} strokeWidth={1.8} className="text-on-ink/70" />
            ) : status === "error" ? (
              <TriangleAlert size={18} strokeWidth={1.8} className="text-on-ink/70" />
            ) : (
              <Camera size={18} strokeWidth={1.8} className="text-on-ink/70" />
            )}
          </span>
          <div>
            <p className="text-[14px] font-semibold text-on-ink">
              {MESSAGE[status].title}
            </p>
            <p className="mx-auto mt-1 max-w-[34ch] text-[12.5px] leading-snug text-on-ink/60">
              {MESSAGE[status].body}
            </p>
          </div>
          {MESSAGE[status].retry ? (
            <button
              type="button"
              onClick={() => void start()}
              className="inline-flex items-center gap-1.5 rounded-full bg-on-ink/10 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.06em] text-on-ink transition-colors hover:bg-on-ink/15"
            >
              <RotateCw size={12} strokeWidth={2.2} />
              Activer la caméra
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
