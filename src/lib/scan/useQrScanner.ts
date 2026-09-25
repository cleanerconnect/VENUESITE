"use client";

// Reading a QR code off the camera.
//
// Two decoders behind one hook. `BarcodeDetector` is native, costs
// nothing to ship and covers Chromium and Android Chrome — which is
// most of a door team's phones. Where it is absent (Safari and iOS
// notably) the hook dynamically imports `jsqr`, so the 250 KB decoder
// only ever downloads on the devices that need it.
//
// Everything the caller sees is `status`. There is always a manual entry
// path beside this on screen, so every failure here is a degradation
// rather than a dead end: no camera, a refused permission and an
// insecure origin all resolve to a state that says which, and the host
// types the code instead.
//
// The portal validates a code; it never mints one. This hook hands the
// scanned string back untouched.

import { useCallback, useEffect, useRef, useState } from "react";

export type ScannerStatus =
  | "idle"
  | "starting"
  | "scanning"
  /** No camera hardware, or the browser exposes no media devices. */
  | "no_camera"
  /** The person said no. Recoverable — they can say yes on retry. */
  | "denied"
  /** getUserMedia needs HTTPS or localhost. */
  | "insecure"
  | "error";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

function nativeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  return ctor ?? null;
}

/** True when the native path is available, for the styleguide and docs. */
export function hasNativeBarcodeDetector(): boolean {
  return nativeDetector() !== null;
}

export interface QrScanner {
  status: ScannerStatus;
  /** Attach to a `<video autoPlay muted playsInline />`. */
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  /** Which decoder is running, once scanning. Surfaced in the UI. */
  decoder: "native" | "bundled" | null;
  start: () => void;
  stop: () => void;
}

export function useQrScanner({
  /** Called once per distinct code. The hook debounces repeats itself. */
  onScan,
  /** Set false to tear the camera down — e.g. when a sheet closes. */
  active,
}: {
  onScan: (code: string) => void;
  active: boolean;
}): QrScanner {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [decoder, setDecoder] = useState<"native" | "bundled" | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setDecoder(null);
  }, []);

  /** One code per 1.5s, so a code held in frame does not fire 60×/second. */
  const emit = useCallback((code: string) => {
    const now = Date.now();
    const last = lastRef.current;
    if (last && last.code === code && now - last.at < 1500) return;
    lastRef.current = { code, at: now };
    onScanRef.current(code);
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      // getUserMedia is only exposed on a secure origin, so its absence
      // on a page served over plain HTTP is the likeliest cause — worth
      // distinguishing, because the fix is a deploy setting.
      setStatus(
        typeof window !== "undefined" && !window.isSecureContext
          ? "insecure"
          : "no_camera",
      );
      return;
    }

    setStatus("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
    } catch (error) {
      const name = (error as { name?: string })?.name;
      setStatus(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "no_camera"
            : "error",
      );
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((t) => t.stop());
      setStatus("error");
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => {});

    const Native = nativeDetector();
    let detect: (source: HTMLVideoElement) => Promise<string | null>;

    if (Native) {
      const instance = new Native({ formats: ["qr_code"] });
      setDecoder("native");
      detect = async (source) => {
        const found = await instance.detect(source).catch(() => []);
        return found[0]?.rawValue ?? null;
      };
    } else {
      // Only downloaded where the native path is missing.
      const { default: jsQR } = await import("jsqr");
      setDecoder("bundled");
      detect = async (source) => {
        const canvas = (canvasRef.current ??= document.createElement("canvas"));
        const w = source.videoWidth;
        const h = source.videoHeight;
        if (!w || !h) return null;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(source, 0, 0, w, h);
        const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, {
          inversionAttempts: "dontInvert",
        });
        return found?.data ?? null;
      };
    }

    setStatus("scanning");

    const tick = async () => {
      const el = videoRef.current;
      if (!el || !streamRef.current) return;
      if (el.readyState >= 2) {
        const code = await detect(el);
        if (code) emit(code.trim());
      }
      rafRef.current = requestAnimationFrame(() => void tick());
    };
    rafRef.current = requestAnimationFrame(() => void tick());
  }, [emit]);

  useEffect(() => {
    if (active) void start();
    else stop();
    return stop;
  }, [active, start, stop]);

  return { status, videoRef, decoder, start, stop };
}
