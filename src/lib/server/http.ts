import "server-only";
export function trustedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowed = [process.env.NEXT_PUBLIC_SITE_URL];
  if (process.env.VERCEL_ENV === "preview") {
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
      if (host) allowed.push(`https://${host}`);
    }
  }

  for (const url of allowed) {
    if (!url) continue;
    try {
      const expected = new URL(url).origin;
      if (expected !== "null" && origin === expected) return expected;
    } catch {
      // A malformed deployment setting must never authorize a request.
    }
  }
  return null;
}

export function sameOrigin(request: Request) {
  return trustedOrigin(request) !== null;
}
export async function readJson(request: Request, max = 8192): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
  let size = 0, body = ""; const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > max) { await reader.cancel(); throw new Error("Request too large"); }
    body += decoder.decode(value, { stream: true });
  }
  const parsed = JSON.parse(body + decoder.decode());
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid request");
  return parsed;
}
