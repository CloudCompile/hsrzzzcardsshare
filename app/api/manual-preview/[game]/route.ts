import { buildManualProfile, manualCatalog } from "@/lib/manual";
import { decodeBuild } from "@/lib/manualCodec";
import { isGame } from "@/lib/site";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ game: string }> },
) {
  const { game } = await context.params;
  if (!isGame(game)) return Response.json({ ok: false }, { status: 400 });

  const url = new URL(request.url);
  const catalog = manualCatalog(game);
  const build = decodeBuild(url.searchParams.get("b"), {
    game,
    char: catalog.characters[0]?.id ?? "",
    level: catalog.maxLevel,
  });
  const profile = buildManualProfile(game, build);
  const character = profile?.characters[0];
  if (!character) return Response.json({ ok: false }, { status: 400 });

  return Response.json(
    { ok: true, character },
    { headers: { "cache-control": "private, no-store" } },
  );
}
