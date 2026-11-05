"use client";

import type { ManualDraft } from "@/lib/manualDrafts";
import type { Character, Game, ShowcaseProfile } from "@/lib/types";

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface CatalogSet {
  id: string;
  name: string;
  bonus: string[];
}

export interface CatalogAgent {
  id: string;
  name: string;
  rarity: number;
  element: string;
  profession?: string;
  path?: string;
}

export interface CatalogWeapon {
  id: string;
  name: string;
  rarity: number;
  profession?: string;
  path?: string;
}

export interface AgentCatalog {
  agents: CatalogAgent[];
  sets: CatalogSet[];
  weapons: CatalogWeapon[];
}

export interface ToolContext {
  game: Game;
  profile: ShowcaseProfile;
  drafts: ManualDraft[];
  loadCatalog: () => Promise<AgentCatalog>;
}

const STAT_ROW_CAP = 14;
const RESULT_CAP = 5200;

export const AGENT_TOOLS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "list_agents",
      description:
        "List every character on the user's showcase with level, rarity, element, role, core skill / eidolon and equipped weapon. Call this first when you are not sure who the user means.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_agent",
      description:
        "Read one showcase character's full build: panel stats, drive discs / relics with every sub stat and roll count, set bonuses and weapon. Use this before making any claim about their stats or gear.",
      parameters: {
        type: "object",
        properties: {
          agent: {
            type: "string",
            description: "Character name (for example 'Jane', 'Jane Doe') or numeric id.",
          },
        },
        required: ["agent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team",
      description:
        "Summarise several characters together: elements, roles, shared sets and gaps, for lineup advice.",
      parameters: {
        type: "object",
        properties: {
          agents: {
            type: "array",
            items: { type: "string" },
            description: "Character names or ids, in slot order.",
          },
        },
        required: ["agents"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_catalog",
      description:
        "Search the game's reference data for drive disc / relic sets, W-Engines / light cones or agents, including the set bonus text. Use it when recommending a set or weapon so the name and effect are right.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name fragment, for example 'branch' or 'anomaly'." },
          kind: {
            type: "string",
            enum: ["set", "weapon", "agent"],
            description: "Restrict the search; omit to search all three.",
          },
        },
        required: ["query"],
      },
    },
  },
];

function clip(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length > RESULT_CAP
    ? `${text.slice(0, RESULT_CAP)}… (truncated)`
    : text;
}

function roleOf(character: Character): string {
  return character.kind === "zzz"
    ? `${character.profession} · Core ${character.coreRank}`
    : `${character.pathName} · E${character.eidolon}`;
}

function weaponLine(character: Character): string {
  const weapon = character.weapon;
  if (!weapon) return "none equipped";
  const rank = character.kind === "zzz" ? `Effect ${weapon.effect}` : `S${weapon.effect}`;
  return `${weapon.name} · ${weapon.rarity}★ · Lv.${weapon.level} · ${rank}`;
}

function digest(character: Character) {
  return {
    id: character.id,
    name: character.name,
    level: character.level,
    rarity: character.rarity,
    element: character.element,
    role: roleOf(character),
    weapon: character.weapon ? character.weapon.name : null,
    sets: character.sets.map((set) => `${set.pieces}pc ${set.name}`),
  };
}

function detail(character: Character) {
  return {
    id: character.id,
    name: character.name,
    level: character.level,
    rarity: character.rarity,
    element: character.element,
    role: roleOf(character),
    panel: character.sheet.slice(0, STAT_ROW_CAP).map((row) =>
      row.detail ? `${row.label}: ${row.value} (${row.detail})` : `${row.label}: ${row.value}`,
    ),
    weapon: weaponLine(character),
    gear: character.gear.map((piece) => ({
      slot: piece.slot,
      set: piece.name,
      level: piece.level,
      main: `${piece.main.label} ${piece.main.value}`,
      subs: piece.subs.map(
        (sub) =>
          `${sub.label} ${sub.value}${sub.rolls && sub.rolls > 1 ? ` x${sub.rolls} rolls` : ""}`,
      ),
    })),
    sets: character.sets.map((set) => ({
      pieces: set.pieces,
      name: set.name,
      bonus: set.bonus,
    })),
  };
}

function matchCharacter(context: ToolContext, query: string): Character | undefined {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return undefined;
  return (
    context.profile.characters.find((character) => character.id === needle) ??
    context.profile.characters.find((character) => character.name.toLowerCase() === needle) ??
    context.profile.characters.find((character) => character.name.toLowerCase().includes(needle)) ??
    context.profile.characters.find((character) => needle.includes(character.name.toLowerCase()))
  );
}

function draftFor(context: ToolContext, characterId: string): ManualDraft | undefined {
  return context.drafts.find((draft) => draft.charId === characterId);
}

function searchCatalog(catalog: AgentCatalog, query: string, kind?: string) {
  const needle = query.trim().toLowerCase();
  const test = (value: string) => value.toLowerCase().includes(needle);
  const out: Record<string, unknown> = {};

  if (!kind || kind === "set") {
    out.sets = catalog.sets
      .filter((set) => test(set.name))
      .slice(0, 8)
      .map((set) => ({ name: set.name, bonus: set.bonus }));
  }
  if (!kind || kind === "weapon") {
    out.weapons = catalog.weapons
      .filter((weapon) => test(weapon.name))
      .slice(0, 8)
      .map((weapon) => ({
        name: weapon.name,
        rarity: weapon.rarity,
        role: weapon.profession ?? weapon.path ?? null,
      }));
  }
  if (!kind || kind === "agent") {
    out.agents = catalog.agents
      .filter((agent) => test(agent.name))
      .slice(0, 8)
      .map((agent) => ({
        name: agent.name,
        rarity: agent.rarity,
        element: agent.element,
        role: agent.profession ?? agent.path ?? null,
      }));
  }

  return out;
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<string> {
  const { profile } = context;

  if (name === "list_agents") {
    return clip({
      game: context.game,
      showcaseCount: profile.characters.length,
      agents: profile.characters.map(digest),
    });
  }

  if (name === "get_agent") {
    const character = matchCharacter(context, String(args.agent ?? ""));
    if (!character) {
      return clip({
        error: "That character is not on the showcase.",
        hint: "Only pinned showcase characters are visible. Ask the user to pin them in game.",
        roster: profile.characters.map((item) => item.name),
      });
    }
    const draft = draftFor(context, character.id);
    return clip({
      source: draft ? "showcase + a manual draft saved in this browser" : "showcase",
      character: detail(character),
      manualDraft: draft
        ? {
            level: draft.build.level,
            coreOrEidolon: draft.build.rank,
            weapon: draft.build.weapon || "none",
            discs: draft.build.pieces.filter((piece) => piece.main || piece.subs.length).length,
            note: "An unsaved manual build exists for this agent; treat it as the user's planned build.",
          }
        : null,
      gameNotes:
        context.game === "zzz"
          ? "ZZZ panel totals here exclude W-Engine stat values and only include 2pc set bonuses."
          : "HSR panel totals include the light cone, relics and set bonuses.",
    });
  }

  if (name === "get_team") {
    const requested = Array.isArray(args.agents) ? args.agents.map(String) : [];
    const members = requested
      .map((query) => matchCharacter(context, query))
      .filter((character): character is Character => Boolean(character));
    if (!members.length) {
      return clip({
        error: "None of those characters are on the showcase.",
        roster: profile.characters.map((item) => item.name),
      });
    }
    const elements = new Map<string, number>();
    const roles = new Map<string, number>();
    for (const member of members) {
      elements.set(member.element, (elements.get(member.element) ?? 0) + 1);
      const role = member.kind === "zzz" ? member.profession : member.pathName;
      roles.set(role, (roles.get(role) ?? 0) + 1);
    }
    return clip({
      members: members.map(digest),
      elements: [...elements.entries()].map(([element, count]) => `${element} x${count}`),
      roles: [...roles.entries()].map(([role, count]) => `${role} x${count}`),
      sharedSets: members
        .flatMap((member) => member.sets.filter((set) => set.pieces >= 2).map((set) => set.name))
        .filter((value, index, all) => all.indexOf(value) !== index),
      missing: requested.filter(
        (query) => !members.some((member) => member.name.toLowerCase() === query.toLowerCase()),
      ),
    });
  }

  if (name === "search_catalog") {
    const catalog = await context.loadCatalog();
    const found = searchCatalog(catalog, String(args.query ?? ""), args.kind ? String(args.kind) : undefined);
    const empty = Object.values(found).every((list) => Array.isArray(list) && list.length === 0);
    return clip(empty ? { error: "No catalog matches.", ...found } : found);
  }

  return clip({ error: `Unknown tool: ${name}` });
}

export const TOOL_LABELS: Record<string, string> = {
  list_agents: "Read the showcase roster",
  get_agent: "Read the build",
  get_team: "Compare the lineup",
  search_catalog: "Search the game data",
};
