import { dataMode, dataModeReason } from "@/lib/data";
import { CAPTURED_AT } from "@/lib/data/static/venue-data";
import { isLiveAi } from "@/lib/ai";

// Which adapters are live.
//
// Every seam falls back to a stand-in when unconfigured, which is what
// makes the demo runnable on a clean clone — and what makes a
// misconfigured deploy look deceptively healthy. This endpoint is how
// you tell the difference without reading the logs.
//
// Read it after every deploy. `data: "static"` in production means the
// portal is serving a committed snapshot to real partners.

export const dynamic = "force-dynamic";

export function GET() {
  const mode = dataMode();

  return Response.json({
    status: "ok",
    adapters: {
      // http = real backend · db = seeded SQLite · static = the snapshot
      data: mode,
      dataReason: dataModeReason(),
      ai: isLiveAi() ? "claude" : "mock",
    },
    // Only meaningful on the static driver; stamped so a stale snapshot
    // is visible rather than mysterious.
    ...(mode === "static" ? { snapshotCapturedAt: CAPTURED_AT } : {}),
  });
}
