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
 * Site backdrop art. Each game's page is dressed with one of the official key visuals
 * from that game's own website, hotlinked off HoYoverse's own CDN. First-party art
 * behind a fan-site disclaimer is what HoYoverse's fan-use policy tolerates; a
 * press-site image is not. URLs rather than bundled files, since the art is not ours
 * to redistribute.
 *
 * These are version-scoped paths, so a future version banner will rotate them away.
 */
export const GAME_BACKDROP: Record<Game, string> = {
  zzz: "https://act-webstatic.hoyoverse.com/puzzle/zzz/pz_ZYBGoSIMEV/resource/puzzle/2026/10/08/770d961b2922411c65767a8a035aad81_4279291793879784965.png?x-oss-process=image/format,webp/quality,Q_90",
  hsr: "https://act-webstatic.hoyoverse.com/puzzle/hkrpg/pz_sEswxe8sSg/resource/puzzle/2026/09/04/33367b8a124f5283012ba6afa614f003_8360406952295795431.png?x-oss-process=image/format,webp/quality,Q_90",
};

/**
 * Card artwork version. Download URLs are cached hard by the browser (the PNG
 * response is served immutable for a year), so the version rides in the URL and
 * bumping it is what actually hands people a redrawn card.
 */
export const CARD_VERSION = "8";

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
