"use client";

import { useMemo, useState } from "react";
import { storeKey, useLocalStore } from "@/lib/storage";
import type { CharacterEdit, EditMap } from "@/lib/edits";
import type { Character, Game } from "@/lib/types";

/**
 * Quick fixes for a showcase card, kept in this browser. They change what you see and
 * what you download; they are never folded into the shareable profile URL.
 */
export function CharacterCorrections({
  character,
  game,
  uid,
}: {
  character: Character;
  game: Game;
  uid: string;
}) {
  const key = storeKey(`edits:${game}:${uid}`);
  const [edits, setEdits, hydrated] = useLocalStore<EditMap>(key, {});
  const [open, setOpen] = useState(false);

  const edit = edits[character.id];
  const rows = useMemo(() => character.sheet.map((row) => row.label), [character.sheet]);
  const changed = Boolean(edit && (edit.level || edit.weaponLevel || Object.keys(edit.sheet ?? {}).length));

  function patch(next: CharacterEdit) {
    setEdits((current) => ({
      ...current,
      [character.id]: { ...next, updatedAt: Date.now() },
    }));
  }

  function setRow(label: string, value: string) {
    const sheet = { ...(edit?.sheet ?? {}) };
    if (!value.trim() || value === character.sheet.find((row) => row.label === label)?.value) {
      delete sheet[label];
    } else {
      sheet[label] = value.slice(0, 24);
    }
    patch({ ...(edit ?? { updatedAt: Date.now() }), sheet });
  }

  const levelOverride = edit?.level ?? character.level;
  const weaponOverride = edit?.weaponLevel ?? character.weapon?.level ?? 0;

  return (
    <section className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="label">Corrections</span>
          {changed ? (
            <span className="rounded-sm bg-[#7cf5d0]/15 px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-[#7cf5d0]">
              edited
            </span>
          ) : null}
        </span>
        <span className="text-[10.5px] text-faint">{open ? "Hide" : "Fix a stat"}</span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-white/[0.07] px-3 py-3">
          <p className="text-[10.5px] leading-relaxed text-faint">
            These stay in this browser and only affect what you see and download. Shared links and
            other people&apos;s cards are untouched.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-faint">
                Level
              </span>
              <input
                type="number"
                min={1}
                max={90}
                value={levelOverride}
                onChange={(event) => patch({ ...edit, level: Number(event.target.value) || character.level })}
                className="num w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-white/25"
              />
            </label>
            {character.weapon ? (
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-faint">
                  Weapon level
                </span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={weaponOverride}
                  onChange={(event) =>
                    patch({ ...edit, weaponLevel: Number(event.target.value) || weaponOverride })
                  }
                  className="num w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none focus:border-white/25"
                />
              </label>
            ) : null}
          </div>

          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-faint">Stat values</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {rows.map((label) => (
                <label key={label} className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-muted">{label}</span>
                  <input
                    value={edit?.sheet?.[label] ?? character.sheet.find((row) => row.label === label)?.value ?? ""}
                    onChange={(event) => setRow(label, event.target.value)}
                    className="num w-[86px] shrink-0 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-right text-[11.5px] text-white outline-none focus:border-white/25"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] leading-relaxed text-faint">
              {hydrated ? "Saved automatically" : "Loading…"}
            </span>
            <button
              type="button"
              onClick={() =>
                setEdits((current) => {
                  const next = { ...current };
                  delete next[character.id];
                  return next;
                })
              }
              className="btn btn-ghost px-2.5 py-1 text-[10.5px]"
            >
              Reset this character
            </button>
          </div>

          {changed ? (
            <p className="text-[10px] text-faint">
              Downloads from this panel carry your corrections.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
