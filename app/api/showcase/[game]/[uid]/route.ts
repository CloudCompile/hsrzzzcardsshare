import { ERROR_COPY, errorFromUnknown, getShowcase, normalizeUid } from "@/lib/enka";
import { isGame } from "@/lib/site";

export const runtime = "nodejs";

/** Client-side consumers (the agent) read the same profile the pages render. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ game: string; uid: string }> },
) {
  const { game, uid } = await context.params;
  if (!isGame(game)) {
    return Response.json({ ok: false, code: "invalid", message: "Unknown game." }, { status: 400 });
  }
  const normalized = normalizeUid(uid);
  if (!normalized) {
    return Response.json(
      { ok: false, code: "invalid", message: ERROR_COPY.invalid.body },
      { status: 400 },
    );
  }

  try {
    const profile = await getShowcase(game, normalized);
    return Response.json(
      { ok: true, profile },
      { headers: { "cache-control": "private, max-age=0, must-revalidate" } },
    );
  } catch (error) {
    const showcaseError = errorFromUnknown(error);
    const copy = ERROR_COPY[showcaseError.code] ?? ERROR_COPY.upstream;
    return Response.json(
      { ok: false, code: showcaseError.code, message: copy.body },
      { status: 502 },
    );
  }
}
