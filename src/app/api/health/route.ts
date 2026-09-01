import { isLiveBackend } from "@/lib/data";
import { isLiveAi } from "@/lib/ai";

// Which adapters are live.
//
// Both seams fall back to mocks when unconfigured, which is what makes
// the demo runnable — and what makes a misconfigured deploy look
// deceptively healthy. This endpoint is how you tell the difference
// without reading the logs.

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    adapters: {
      data: isLiveBackend() ? "http" : "mock",
      ai: isLiveAi() ? "claude" : "mock",
    },
  });
}
