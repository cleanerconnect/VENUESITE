import { NextRequest } from "next/server";
import { getAdvisor } from "@/lib/ai";
import { getRestaurantRepository } from "@/lib/data";

// Streaming assistant endpoint.
//
// Emits Server-Sent Events so the existing token-by-token typing UI works
// against a real model with no change to the component: it already
// consumes chunks, it just gets them from here instead of a canned
// generator.
//
// The client never sees the API key, never sees the system prompt, and
// cannot choose the model — all three live server-side, which is the
// whole reason this route exists rather than calling the SDK from the
// browser.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    prompt?: string;
    restaurantId?: string;
  } | null;

  const prompt = body?.prompt?.trim();
  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }
  if (prompt.length > 2_000) {
    return Response.json({ error: "prompt too long" }, { status: 413 });
  }

  const data = await getRestaurantRepository().getOverview(
    body?.restaurantId ?? "",
  );
  const advisor = getAdvisor();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of advisor.assistant(
          prompt,
          data,
          request.signal,
        )) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        // The client has already rendered part of an answer; an error
        // event lets it show that the reply was cut off rather than
        // leaving a half-sentence that looks complete.
        console.error("[assistant] stream failed", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "stream_failed" })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx buffers SSE by default, which turns a token stream into one
      // delivery at the end.
      "X-Accel-Buffering": "no",
    },
  });
}
