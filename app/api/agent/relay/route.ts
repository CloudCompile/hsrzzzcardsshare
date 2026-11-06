import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";

/** Anything that is not a routable public address: loopback, LAN, link-local, CGNAT, ULA. */
function isPublicAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false;
    return true;
  }
  if (kind === 6) {
    const lower = address.toLowerCase();
    if (lower === "::" || lower === "::1") return false;
    if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return false;
    if (lower.startsWith("::ffff:")) return isPublicAddress(lower.slice(7));
    return true;
  }
  return false;
}

/**
 * The https + path checks alone do not stop a hostname that resolves somewhere
 * internal, so the name is resolved here and every answer must be public. DNS can
 * still change between this lookup and the connection, which is why the request also
 * refuses redirects: it can never be walked onto another origin mid-flight.
 */
async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host);
  try {
    const addresses = await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every((entry) => isPublicAddress(entry.address));
  } catch {
    return false;
  }
}

/**
 * Optional CORS escape hatch: forwards one chat completion to the provider the user
 * configured. The key is read from the request header and never stored or logged.
 */
export async function POST(request: Request) {
  const target = request.headers.get("x-astra-target") ?? "";
  const key = request.headers.get("x-astra-key") ?? "";

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return Response.json({ error: { message: "Invalid target URL." } }, { status: 400 });
  }

  if (url.protocol !== "https:") {
    return Response.json(
      { error: { message: "The relay only forwards to https endpoints." } },
      { status: 400 },
    );
  }
  if (!/\/chat\/completions$/.test(url.pathname)) {
    return Response.json(
      { error: { message: "The relay only forwards chat completion requests." } },
      { status: 400 },
    );
  }

  if (!(await isPublicHost(url.hostname))) {
    return Response.json(
      { error: { message: "The relay only forwards to public provider hosts." } },
      { status: 400 },
    );
  }

  const body = await request.text();
  if (body.length > 2_000_000) {
    return Response.json({ error: { message: "Request too large." } }, { status: 413 });
  }

  const upstream = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });

  if (upstream.status >= 300 && upstream.status < 400) {
    return Response.json(
      { error: { message: "The provider redirected the request; the relay does not follow redirects." } },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
