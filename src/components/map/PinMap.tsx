"use client";

// The venue on a map, with a pin the partner can move.
//
// Leaflet and OpenStreetMap tiles: no API key, no account, no vendor to
// onboard before a maquette can be shown — which is the same reason the
// portal has no Google Maps dependency. The address is geocoded through
// our own `/api/geocode` route, and the pin is draggable because a
// geocoder is right about a street and wrong about which side of the
// courtyard a riad's door is on.
//
// Everything is optional. A venue with no coordinates is listed on its
// address, and the step that collects them says so.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import "leaflet/dist/leaflet.css";

/** Jemaa el-Fna. A map has to open somewhere. */
const FALLBACK: [number, number] = [31.6295, -7.9811];

/** A transparent pixel, so an unreachable tile server draws nothing
 *  rather than a grid of broken images. */
const BLANK =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function PinMap({
  latitude,
  longitude,
  address,
  city,
  onChange,
  height = 260,
}: {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city?: string;
  onChange: (latitude: number | null, longitude: number | null) => void;
  height?: number;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "not_found" | "unreachable">(
    "idle",
  );
  const [ready, setReady] = useState(false);

  // Kept in a ref so the drag handler never closes over a stale prop.
  const notify = useRef(onChange);
  notify.current = onChange;

  useEffect(() => {
    let cancelled = false;
    let instance: LeafletMap | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current || map.current) return;

      instance = L.map(holder.current, {
        center: latitude != null && longitude != null ? [latitude, longitude] : FALLBACK,
        zoom: latitude != null && longitude != null ? 16 : 12,
        // A map inside a form should not eat the page's scroll.
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        errorTileUrl: BLANK,
        attribution: "© OpenStreetMap",
      }).addTo(instance);

      const icon = L.divIcon({
        className: "lyfe-pin",
        html:
          '<span style="display:block;width:26px;height:26px;border-radius:50%;' +
          "background:var(--color-violet-deep,#6b3f8a);border:3px solid #fff;" +
          'box-shadow:0 2px 6px rgba(10,31,61,.35)"></span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker(
        latitude != null && longitude != null ? [latitude, longitude] : FALLBACK,
        { draggable: true, icon, opacity: latitude != null && longitude != null ? 1 : 0.45 },
      ).addTo(instance);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        marker.setOpacity(1);
        notify.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });
      instance.on("click", (event) => {
        const { lat, lng } = (event as unknown as { latlng: { lat: number; lng: number } }).latlng;
        marker.setLatLng([lat, lng]);
        marker.setOpacity(1);
        notify.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });

      map.current = instance;
      pin.current = marker;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
      pin.current = null;
    };
    // Built once: later coordinate changes move the pin in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coordinates changed from outside — a geocode, or a draft reopening.
  useEffect(() => {
    if (!ready || !map.current || !pin.current) return;
    if (latitude == null || longitude == null) {
      pin.current.setOpacity(0.45);
      return;
    }
    pin.current.setLatLng([latitude, longitude]);
    pin.current.setOpacity(1);
    map.current.setView([latitude, longitude], Math.max(map.current.getZoom(), 16));
  }, [latitude, longitude, ready]);

  const locate = useCallback(async () => {
    const query = [address, city, "Maroc"].filter(Boolean).join(", ");
    setStatus("searching");
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const body = (await response.json()) as {
        ok: boolean;
        latitude?: number;
        longitude?: number;
      };
      if (body.ok && body.latitude != null && body.longitude != null) {
        setStatus("idle");
        onChange(body.latitude, body.longitude);
        return;
      }
      setStatus(response.status === 404 ? "not_found" : "unreachable");
    } catch {
      setStatus("unreachable");
    }
  }, [address, city, onChange]);

  const placed = latitude != null && longitude != null;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={holder}
        style={{ height }}
        className="w-full rounded-[var(--radius-md)] border border-line overflow-hidden bg-canvas-2 z-0"
        aria-label="Carte de l'établissement"
      />
      <div className="flex flex-wrap items-center gap-3">
        <MapPin size={18} className="text-violet-deep shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">
            {placed ? "Point placé" : "Placer le point sur la carte"}
          </div>
          <p className="text-meta text-ink-mute mt-1">
            {status === "searching"
              ? "Recherche de l'adresse…"
              : status === "not_found"
                ? "Adresse introuvable. Déplacez le point à la main."
                : status === "unreachable"
                  ? "Le service de localisation ne répond pas. Déplacez le point à la main."
                  : placed
                    ? `${latitude!.toFixed(4)}, ${longitude!.toFixed(4)} · faites glisser le point pour l'ajuster`
                    : "Facultatif. Sans point, nous plaçons votre établissement sur l'adresse."}
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={locate}
          disabled={status === "searching" || address.trim().length < 4}
        >
          Trouver sur la carte
        </Button>
        {placed ? (
          <Button variant="ghost" size="md" onClick={() => onChange(null, null)}>
            Retirer
          </Button>
        ) : null}
      </div>
    </div>
  );
}
