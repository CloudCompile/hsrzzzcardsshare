import {
  hsrCharacterList,
  hsrCharacterMeta,
  hsrLightConeList,
  hsrPathName,
  hsrRelicSetList,
  hsrRelicSetMeta,
} from "@/lib/hsr";
import { isGame } from "@/lib/site";
import { zzzAgentList, zzzSuitBonusList, zzzWeaponList } from "@/lib/zzz";
import type { Game } from "@/lib/types";

export const runtime = "nodejs";

/** Compact reference data the agent can search: names, roles and set bonus text. */
function catalog(game: Game) {
  if (game === "zzz") {
    return {
      game,
      agents: zzzAgentList().map((agent) => ({
        id: agent.id,
        name: agent.name,
        rarity: agent.rarity,
        element: agent.element,
        profession: agent.profession,
      })),
      sets: zzzSuitBonusList(),
      weapons: zzzWeaponList().map((weapon) => ({
        id: weapon.id,
        name: weapon.name,
        rarity: weapon.rarity,
        profession: weapon.profession,
      })),
    };
  }

  return {
    game,
    agents: hsrCharacterList().map((character) => ({
      id: character.id,
      name: character.name,
      rarity: character.rarity,
      element: character.element,
      path: hsrPathName(hsrCharacterMeta(character.id)?.path ?? ""),
    })),
    sets: hsrRelicSetList().map((set) => ({
      id: set.id,
      name: set.name,
      bonus: hsrRelicSetMeta(set.id)?.desc ?? [],
    })),
    weapons: hsrLightConeList().map((cone) => ({
      id: cone.id,
      name: cone.name,
      rarity: cone.rarity,
      path: hsrPathName(cone.path),
    })),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ game: string }> },
) {
  const { game } = await context.params;
  if (!isGame(game)) return Response.json({ ok: false }, { status: 400 });

  return Response.json(
    { ok: true, ...catalog(game) },
    { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
