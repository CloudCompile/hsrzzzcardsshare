import type { Game } from "./types";

export const SITE = {
  name: "Astra",
  tagline: "Your account, carded.",
  description:
    "Paste your Zenless Zone Zero or Honkai: Star Rail UID and get shareable showcase cards: full character sheets with stats and gear, plus team build cards.",
};

export const GAMES: Record<
  Game,
  { key: Game; label: string; short: string; accent: string; uidLength: string; example: string }
> = {
  zzz: {
    key: "zzz",
    label: "Zenless Zone Zero",
    short: "ZZZ",
    accent: "#f7d84a",
    uidLength: "8–10 digits",
    example: "1300000579",
  },
  hsr: {
    key: "hsr",
    label: "Honkai: Star Rail",
    short: "HSR",
    accent: "#8ec5ff",
    uidLength: "9 digits",
    example: "801010942",
  },
};

export const TEAM_SIZE: Record<Game, number> = { zzz: 3, hsr: 4 };

/**
 * Site backdrop art. Each game's page is dressed with one standing splash from the
 * same CDNs the cards already pull from, so the site reads as that game while you
 * are in it. Kept as URLs rather than bundled files: the art is licensed third-party
 * material the app links to, it is not redistributed here.
 */
export const GAME_BACKDROP: Record<Game, string> = {
  zzz: "https://enka.network/ui/zzz/IconRole67.png",
  hsr: "https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/image/character_portrait/1310.png",
};

/**
 * Card artwork version. Download URLs are cached hard by the browser (the PNG
 * response is served immutable for a year), so the version rides in the URL and
 * bumping it is what actually hands people a redrawn card.
 */
export const CARD_VERSION = "7";

export const ZZZ_ELEMENT_COLORS: Record<string, string> = {
  Physical: "#f3c25d",
  Fire: "#ff6a4d",
  Ice: "#63d8ff",
  Elec: "#8f8dff",
  Ether: "#cf7bff",
  Wind: "#57e3a8",
  AuricInk: "#e9c76b",
  AuricEther: "#f0d68a",
};

export const ZZZ_ELEMENT_LABELS: Record<string, string> = {
  Elec: "Electric",
  Physical: "Physical",
  Fire: "Fire",
  Ice: "Ice",
  Ether: "Ether",
  Wind: "Wind",
  AuricInk: "Auric Ink",
  AuricEther: "Auric Ether",
};

export function zzzElementColor(element: string) {
  return ZZZ_ELEMENT_COLORS[element] ?? "#9d8cff";
}

export function isGame(value: string | undefined | null): value is Game {
  return value === "zzz" || value === "hsr";
}
