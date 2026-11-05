import type { Character } from "./types";

/**
 * A correction the user typed over their own showcase data. These never leave the
 * browser unless they are folded into a one-off PNG request, so they can't change a
 * shared link for anyone else.
 */
export interface CharacterEdit {
  level?: number;
  weaponLevel?: number;
  /** Stat row label -> replacement display value, e.g. { "CRIT Rate": "68.4%" }. */
  sheet?: Record<string, string>;
  updatedAt: number;
}

export type EditMap = Record<string, CharacterEdit>;

const MAX_VALUE = 24;
const MAX_ROWS = 40;

function clampInt(value: unknown, min: number, max: number): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function applyCharacterEdit(character: Character, edit?: CharacterEdit | null): Character {
  if (!edit) return character;
  const sheet = edit.sheet
    ? character.sheet.map((row) => {
        const replacement = edit.sheet?.[row.label];
        return typeof replacement === "string" && replacement.trim()
          ? { ...row, value: replacement, detail: undefined }
          : row;
      })
    : character.sheet;

  return {
    ...character,
    level: edit.level ?? character.level,
    sheet,
    weapon:
      character.weapon && edit.weaponLevel
        ? { ...character.weapon, level: edit.weaponLevel }
        : character.weapon,
  };
}

function b64url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeEdits(edits: EditMap): string {
  return b64url(JSON.stringify(edits));
}

export function decodeEdits(raw: string | null | undefined): EditMap {
  if (!raw) return {};
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const out: EditMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>).slice(0, 24)) {
      if (!value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      const sheet: Record<string, string> = {};
      if (record.sheet && typeof record.sheet === "object") {
        for (const [label, text] of Object.entries(record.sheet as Record<string, unknown>).slice(
          0,
          MAX_ROWS,
        )) {
          if (typeof text === "string" && label.length <= 40) sheet[label] = text.slice(0, MAX_VALUE);
        }
      }
      out[id] = {
        level: clampInt(record.level, 1, 90),
        weaponLevel: clampInt(record.weaponLevel, 1, 90),
        sheet,
        updatedAt: Number(record.updatedAt) || Date.now(),
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** Trimmed copy for a single character, small enough to ride in a download URL. */
export function editParam(edit?: CharacterEdit | null): string | null {
  if (!edit) return null;
  const compact: CharacterEdit = {
    ...(edit.level !== undefined ? { level: edit.level } : {}),
    ...(edit.weaponLevel !== undefined ? { weaponLevel: edit.weaponLevel } : {}),
    ...(edit.sheet && Object.keys(edit.sheet).length ? { sheet: edit.sheet } : {}),
    updatedAt: edit.updatedAt,
  };
  if (!compact.level && !compact.weaponLevel && !compact.sheet) return null;
  return encodeEdits({ edited: compact });
}

/** Reads the `edited` entry out of a decoded map, whatever id the UI used. */
export function singleEdit(edits: EditMap): CharacterEdit | null {
  return edits.edited ?? Object.values(edits)[0] ?? null;
}
