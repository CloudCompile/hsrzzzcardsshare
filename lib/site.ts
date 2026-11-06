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
 * Site backdrop art. Each game's page is dressed with one key art, so the site reads
 * as that game while you are in it. Both are the CDN's own resized webp/avif
 * variants, which keeps the layer under ~100 KB instead of the full-size original. Kept as URLs rather than bundled files: the art is licensed third-party
 * material the app links to, it is not redistributed here.
 */
export const GAME_BACKDROP: Record<Game, string> = {
  zzz: "https://static0.gamerantimages.com/wordpress/wp-content/uploads/2024/12/zenless-zone-zero-a-storm-of-falling-stars-miyabi.jpg",
  hsr: "https://upload-os-bbs.hoyolab.com/upload/2025/01/03/40717305/cf81202113e38099323d48c05ea6d10f_5427875743258003648.jpg?x-oss-process=image%2Fresize%2Cs_1000%2Fauto-orient%2C0%2Finterlace%2C1%2Fformat%2Cwebp%2Fquality%2Cq_70",
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
