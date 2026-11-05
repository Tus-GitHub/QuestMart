export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function jsonResponse(data, status = 200, headers = {}) {
  return Response.json(data, {
    status, headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function errorResponse(error) {
  if (error instanceof ApiError) {
    return jsonResponse({ success: false, message: error.message }, error.status);
  }
  return jsonResponse({ success: false, message: "Service unavailable. Please try again." }, 500);
}

export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") throw new ApiError(403, "Request origin is not allowed.");
  if (origin) {
    // Configure APP_ORIGIN only for a trusted proxy that rewrites the request URL.
    // Never infer the trusted origin from user-supplied forwarded headers.
    const expected = new URL(process.env.APP_ORIGIN || request.url);
    let incoming;
    try { incoming = new URL(origin); }
    catch { throw new ApiError(403, "Request origin is not allowed."); }
    // Next normalizes the loopback request hostname to localhost. Treat only
    // these exact local aliases as equivalent; retain protocol and port checks.
    const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    const equivalentLoopback = !process.env.APP_ORIGIN
      && origin === incoming.origin
      && loopbackHosts.has(expected.hostname)
      && loopbackHosts.has(incoming.hostname)
      && expected.protocol === incoming.protocol
      && expected.port === incoming.port;
    if (origin !== expected.origin && !equivalentLoopback) {
      throw new ApiError(403, "Request origin is not allowed.");
    }
  } else if (request.headers.has("cookie") && site !== "same-origin") {
    throw new ApiError(403, "Request origin is required.");
  }
}

export async function readJson(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
    throw new ApiError(415, "Send an application/json request.");
  }
  const maxBytes = 16384;
  if (Number(request.headers.get("content-length")) > maxBytes) {
    throw new ApiError(413, "Request is too large.");
  }
  if (!request.body) throw new ApiError(400, "Invalid JSON request.");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let data;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks, length));
    data = JSON.parse(text);
  }
  catch { throw new ApiError(400, "Invalid JSON request."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ApiError(400, "Request must be a JSON object.");
  }
  return data;
}
