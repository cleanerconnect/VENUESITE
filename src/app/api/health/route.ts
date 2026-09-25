import { dataEngine, dataMode, dataModeReason } from "@/lib/data";
import { CAPTURED_AT } from "@/lib/data/static/venue-data";
import { isLiveAi } from "@/lib/ai";
import { activeLot, activeLotReason } from "@/lib/lot";

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
    // Which product this instance is serving. A deploy that means to
    // show the contracted dashboard and reads 2 here is showing
    // fourteen screens nobody bought.
    lot: activeLot(),
    lotReason: activeLotReason(),
    adapters: {
      // http = real backend · db = Postgres or SQLite · static = snapshot
      data: mode,
      dataReason: dataModeReason(),
      // Which engine answered, when the answer is a database. A deploy
      // meant to run on Neon that reads "sqlite" is running on a file
      // that a redeploy will throw away.
      ...(mode === "db" ? { dataEngine: dataEngine() } : {}),
      ai: isLiveAi() ? "claude" : "mock",
    },
    // Only meaningful on the static driver; stamped so a stale snapshot
    // is visible rather than mysterious.
    ...(mode === "static" ? { snapshotCapturedAt: CAPTURED_AT } : {}),
  });
}
