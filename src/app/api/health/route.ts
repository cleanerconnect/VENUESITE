import { dataEngine, dataMode, dataModeReason } from "@/lib/data";
import { CAPTURED_AT } from "@/lib/data/static/venue-data";
import { isLiveAi } from "@/lib/ai";
import { activeLot, activeLotReason } from "@/lib/lot";
import { sessionKeySource } from "@/lib/auth/cookie";
import { demoAccountsUsable } from "@/lib/auth/accounts";

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
    // Whether the session cookies are signed with a durable key. `false`
    // on a deployment means the portal signs with a per-process random
    // key: sessions do not survive a restart or reach a second
    // instance, which on Vercel is every request. See `auth/cookie.ts`.
    // Where the cookie-signing key comes from. `configuré` is the only
    // answer a deployment should give: `fichier local` cannot exist on a
    // serverless filesystem, and `éphémère` means a session does not
    // survive the request that created it. See `auth/cookie.ts`.
    sessionKey: sessionKeySource(),
    // Whether the seven fixture pairs in `auth/accounts.ts` can sign
    // in. `usable` on a deployment serving real partners means seven
    // accounts share one password that is written in the source — one
    // of them being the account that validates listings. Without a
    // database it is always `usable`, because there is no other door.
    demoAccounts: demoAccountsUsable() ? "usable" : "off",
    // Only meaningful on the static driver; stamped so a stale snapshot
    // is visible rather than mysterious.
    ...(mode === "static" ? { snapshotCapturedAt: CAPTURED_AT } : {}),
  });
}
