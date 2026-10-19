import { NextRequest, NextResponse } from "next/server";
import { apiError, sessionToken, unauthorized } from "@/lib/api";
import { UpstreamError, isMockMode, openUsageStream } from "@/lib/nine-router";
import { getDemoStats, subscribeDemo } from "@/lib/mock";
import type { Stats } from "@/lib/types";

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export async function GET(request: NextRequest) {
  if (isMockMode()) {
    return demoStream(request);
  }

  const token = sessionToken(request);
  if (!token) return unauthorized();

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  request.signal.addEventListener("abort", onAbort);

  try {
    const upstream = await openUsageStream(token, controller.signal);
    const reader = upstream.body!.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(streamController) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            streamController.enqueue(value);
          }
        } catch {
          // Either side disconnected. Closing below is enough.
        } finally {
          request.signal.removeEventListener("abort", onAbort);
          try {
            streamController.close();
          } catch {
            // The client may already be gone.
          }
        }
      },
      cancel() {
        request.signal.removeEventListener("abort", onAbort);
        controller.abort();
        void reader.cancel().catch(() => {});
      },
    });

    return new NextResponse(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    request.signal.removeEventListener("abort", onAbort);
    if (error instanceof UpstreamError) {
      return new NextResponse(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }
    return apiError(error);
  }
}

function demoStream(request: NextRequest): NextResponse {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    unsubscribe?.();
    if (keepalive) clearInterval(keepalive);
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (stats: Stats) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`));
        } catch {
          cleanup();
        }
      };

      send(getDemoStats());
      unsubscribe = subscribeDemo(send);
      keepalive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 25000);

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // The client may already be gone.
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new NextResponse(stream, { headers: STREAM_HEADERS });
}
