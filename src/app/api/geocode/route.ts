import { NextResponse } from "next/server";

// Address → coordinates, through Nominatim.
//
// It runs here rather than in the browser for two reasons: Nominatim's
// usage policy asks for an identifying User-Agent, which a browser will
// not let us set, and a server route can hold the timeout and the
// country filter in one place instead of in every caller.
//
// No API key, no account, no vendor: the same reason the map draws
// OpenStreetMap tiles. The trade is rate limits — one request a second —
// which is the right shape for a partner typing one address.

export const dynamic = "force-dynamic";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const AGENT = "LYFE-Portail-Partenaire/1.0 (contact@lyfemaroc.org)";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 4) {
    return NextResponse.json({ ok: false, reason: "query_too_short" }, { status: 400 });
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  // Every venue in scope is Moroccan, and the filter is what stops
  // « 12 rue de la Liberté » landing in France.
  url.searchParams.set("countrycodes", "ma");
  url.searchParams.set("addressdetails", "0");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": AGENT, "Accept-Language": "fr" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ ok: false, reason: "upstream" }, { status: 502 });
    }
    const hits = (await response.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = hits[0];
    if (!hit) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
      label: String(hit.display_name),
    });
  } catch {
    // A geocoder that is down must not block the step: the flow says so
    // and lets the partner place the pin by hand.
    return NextResponse.json({ ok: false, reason: "unreachable" }, { status: 503 });
  }
}
