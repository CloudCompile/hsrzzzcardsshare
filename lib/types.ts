export type Game = "zzz" | "hsr";

export interface StatRow {
  label: string;
  value: string;
  hint?: string;
  /** The base + added split behind the value, e.g. "1411 + 800" or "+8.2%". */
  detail?: string;
}

export interface GearSub {
  label: string;
  value: string;
  rolls?: number;
}

export interface GearPiece {
  slot: string;
  name: string;
  rarity: number;
  level: number;
  icon: string | null;
  main: GearSub;
  subs: GearSub[];
}

export interface SetGroup {
  id: string;
  name: string;
  pieces: number;
  icon: string | null;
  bonus: string[];
}

export interface WeaponInfo {
  id: string;
  name: string;
  rarity: number;
  level: number;
  effect: number;
  icon: string | null;
  subtitle: string;
  /** The weapon's own base stats, when the source exposes them. */
  base?: { hp: number; atk: number; def: number } | null;
}

export interface PlayerSummary {
  game: Game;
  uid: string;
  nickname: string;
  level: number;
  signature: string | null;
  worldLevel?: number;
  achievements?: number;
  platform?: string;
  region?: string;
  updatedAt: number;
}

interface CharacterBase {
  id: string;
  name: string;
  rarity: number;
  level: number;
  element: string;
  elementColor: string;
  icon: string | null;
  portrait: string | null;
  accent: string;
  sheet: StatRow[];
  sets: SetGroup[];
  gear: GearPiece[];
  weapon: WeaponInfo | null;
}

export interface ZzzCharacter extends CharacterBase {
  kind: "zzz";
  profession: string;
  promotion: number;
  core: number;
  coreRank: string;
}

export interface HsrCharacter extends CharacterBase {
  kind: "hsr";
  path: string;
  pathName: string;
  pathIcon: string | null;
  eidolon: number;
  traceCount: number;
}

export type Character = ZzzCharacter | HsrCharacter;

export interface ShowcaseProfile {
  player: PlayerSummary;
  characters: Character[];
}
