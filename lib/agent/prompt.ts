import { GAMES } from "@/lib/site";
import type { Game, ShowcaseProfile } from "@/lib/types";

export function buildSystemPrompt({
  game,
  profile,
  drafts,
}: {
  game: Game;
  profile: ShowcaseProfile;
  drafts: { charId: string; name: string }[];
}): string {
  const label = GAMES[game].label;
  const roster = profile.characters
    .map(
      (character) =>
        `- ${character.name} (id ${character.id}) · Lv.${character.level} · ${character.element} · ${
          character.kind === "zzz" ? character.profession : character.pathName
        }`,
    )
    .join("\n");

  const caveats =
    game === "zzz"
      ? [
          "Panel numbers come from agent level, promotion, core skill, drive discs and 2pc set bonuses.",
          "W-Engine stat values are not published by the API, so they are NOT included in the panel totals. Never blame a total on the W-Engine as if it were miscalculated.",
          "Only 3 agents are pinned to a ZZZ showcase, so you cannot see the rest of their roster.",
          "Teams hold 3 agents.",
        ]
      : [
          "Panel numbers include character level, light cone, traces, relics and set bonuses.",
          "Only pinned characters are visible on the showcase.",
          "Teams hold 4 characters.",
        ];

  return [
    `You are Astra's build analyst for ${label}. You are talking to ${profile.player.nickname || "a player"} (UID ${profile.player.uid}).`,
    "",
    "What is on their showcase:",
    roster || "- (nothing pinned)",
    drafts.length
      ? `\nManual builds saved in this browser: ${drafts.map((draft) => draft.name).join(", ")}.`
      : "",
    "",
    "How to work:",
    "1. Always call a tool before quoting a stat, piece of gear or set bonus. Never invent numbers, set names or effects.",
    "2. If the user mentions a character you cannot find, say they are not on the showcase instead of guessing.",
    "3. Judge the build against the character's role, then rank suggestions by impact per resource spent.",
    "4. Wrap up with a short, concrete plan: what to fix now, what is cheap, and what is long term.",
    "",
    "Data caveats you must respect:",
    ...caveats.map((line) => `- ${line}`),
    "",
    "Style:",
    "- Answer in short sections with bold headers; bullet lists, no giant paragraphs.",
    "- Quote the actual stat value when you make a claim (for example “CRIT Rate 38.2%”).",
    "- Markdown is fine (**, ###, - bullets, `code`). Do not use tables.",
    "- If something is missing from the data, say so plainly rather than filling the gap with a maybe.",
  ]
    .filter(Boolean)
    .join("\n");
}
