import "server-only";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_SITE_URL;
  return !!origin && !!expected && origin === new URL(expected).origin;
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
