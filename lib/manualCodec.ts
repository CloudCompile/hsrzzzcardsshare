import type { Game } from "./types";

/** A single stat line the user typed: key is a game prop id/type, v is the displayed value. */
export interface ManualStatLine {
  k: string;
  v: number;
}

export interface ManualPiece {
  slot: number;
  set: string;
  level: number;
  main: ManualStatLine | null;
  subs: ManualStatLine[];
}

export interface ManualBuild {
  game: Game;
  char: string;
  level: number;
  promotion: number;
  rank: number;
  weapon: string;
  weaponLevel: number;
  weaponRank: number;
  weaponStats: ManualStatLine[];
  pieces: ManualPiece[];
  extras: ManualStatLine[];
  nickname: string;
}

export function defaultBuild(game: Game, char: string, level: number): ManualBuild {
  return {
    game,
    char,
    level,
    promotion: 6,
    rank: 0,
    weapon: "",
    weaponLevel: level,
    weaponRank: 1,
    weaponStats: [],
    pieces: Array.from({ length: 6 }, (_, index) => ({
      slot: index + 1,
      set: "",
      level: 15,
      main: null,
      subs: [],
    })),
    extras: [],
    nickname: "",
  };
}

function b64urlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBuild(build: ManualBuild): string {
  return b64urlEncode(JSON.stringify(build));
}

const MAX_FIELD = 80;

function text(value: unknown, max = MAX_FIELD): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readLine(raw: unknown): ManualStatLine | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const key = text(record.k, 40);
  if (!key) return null;
  return { k: key, v: clampNumber(record.v, -1000000, 1000000, 0) };
}

function readLines(raw: unknown, max: number): ManualStatLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, max)
    .map(readLine)
    .filter((line): line is ManualStatLine => Boolean(line));
}

/** Decodes a shared build, ignoring anything malformed and clamping obviously wrong values. */
export function decodeBuild(
  raw: string | null | undefined,
  fallback: { game: Game; char: string; level: number },
): ManualBuild {
  const base = defaultBuild(fallback.game, fallback.char, fallback.level);
  if (!raw) return base;

  try {
    const parsed = JSON.parse(b64urlDecode(raw)) as Partial<ManualBuild>;
    const maxLevel = fallback.game === "zzz" ? 60 : 80;
    const rawPieces = Array.isArray(parsed.pieces) ? parsed.pieces : [];

    const pieces: ManualPiece[] = Array.from({ length: 6 }, (_, index) => {
      const slot = index + 1;
      const match = rawPieces.find((piece) => Number(piece?.slot) === slot);
      return {
        slot,
        set: text(match?.set, 24),
        level: clampNumber(match?.level, 0, 15, 15),
        main: readLine(match?.main),
        subs: readLines(match?.subs, 4),
      };
    });

    return {
      game: fallback.game,
      char: text(parsed.char, 24) || fallback.char,
      level: clampNumber(parsed.level, 1, maxLevel, base.level),
      promotion: clampNumber(parsed.promotion, 0, 6, base.promotion),
      rank: clampNumber(parsed.rank, 0, 6, 0),
      weapon: text(parsed.weapon, 24),
      weaponLevel: clampNumber(parsed.weaponLevel, 1, maxLevel, fallback.level),
      weaponRank: clampNumber(parsed.weaponRank, 1, 5, 1),
      weaponStats: readLines(parsed.weaponStats, 8),
      pieces,
      extras: readLines(parsed.extras, 12),
      nickname: text(parsed.nickname, 42),
    };
  } catch {
    return base;
  }
}
