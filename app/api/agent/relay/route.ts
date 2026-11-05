export const runtime = "nodejs";

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
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
