"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { Stars, StatGrid } from "./ui";
import { GAMES } from "@/lib/site";
import { encodeBuild } from "@/lib/manualCodec";
import { saveManualDraft } from "@/lib/manualDrafts";
import type { ManualBuild, ManualPiece, ManualStatLine } from "@/lib/manualCodec";
import type { ManualCatalog, StatOption } from "@/lib/manual";
import type { Character, Game } from "@/lib/types";

const FIELD =
  "w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/25";

function StatLines({
  lines,
  options,
  onChange,
  max,
  addLabel,
}: {
  lines: ManualStatLine[];
  options: StatOption[];
  onChange: (lines: ManualStatLine[]) => void;
  max: number;
  addLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <select
            value={line.k}
            onChange={(event) =>
              onChange(lines.map((item, i) => (i === index ? { ...item, k: event.target.value } : item)))
            }
            className={FIELD}
            aria-label={addLabel}
          >
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            value={Number.isFinite(line.v) ? line.v : 0}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              onChange(
                lines.map((item, i) =>
                  i === index ? { ...item, v: Number.isFinite(parsed) ? parsed : 0 } : item,
                ),
              );
            }}
            className={`${FIELD} num w-20 shrink-0`}
            aria-label={`${addLabel} value`}
          />
          <button
            type="button"
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
            className="btn btn-ghost h-[30px] w-[30px] shrink-0 p-0 text-[11px]"
            aria-label={`Remove ${addLabel}`}
          >
            ✕
          </button>
        </div>
      ))}
      {lines.length < max ? (
        <button
          type="button"
          onClick={() => onChange([...lines, { k: options[0]?.key ?? "", v: 0 }])}
          className="btn btn-ghost px-2.5 py-1 text-[11px]"
        >
          + Add {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ManualBuilder({
  game,
  initialBuild,
  catalog,
  options,
  initialCharacter,
}: {
  game: Game;
  initialBuild: ManualBuild;
  catalog: ManualCatalog;
  options: StatOption[];
  initialCharacter: Character | null;
}) {
  const [build, setBuild] = useState<ManualBuild>(initialBuild);
  const [character, setCharacter] = useState<Character | null>(initialCharacter);
  const [filter, setFilter] = useState("");
  const [origin, setOrigin] = useState("");
  const [savedAt, setSavedAt] = useState(0);
  // Only autosave once the user actually edits, so opening a shared link stays read-only.
  const touched = useRef(false);

  const encoded = useMemo(() => encodeBuild(build), [build]);
  const optionLabel = useMemo(
    () => new Map(options.map((option) => [option.key, option.label])),
    [options],
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Keep the address bar shareable without a server round trip.
  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}?b=${encoded}`);
  }, [encoded]);

  // Recompute the panel on the server whenever the build changes.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/manual-preview/${game}?b=${encoded}`)
        .then((response) => response.json())
        .then((data: { ok?: boolean; character?: Character }) => {
          if (cancelled) return;
          if (data?.ok && data.character) setCharacter(data.character);
        })
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [encoded, game]);

  const update = (patch: Partial<ManualBuild>) => {
    touched.current = true;
    setBuild((current) => ({ ...current, ...patch }));
  };
  const updatePiece = (slot: number, patch: Partial<ManualPiece>) => {
    touched.current = true;
    setBuild((current) => ({
      ...current,
      pieces: current.pieces.map((piece) => (piece.slot === slot ? { ...piece, ...patch } : piece)),
    }));
  };

  // Keep a copy in this browser so a refresh doesn't lose the build.
  useEffect(() => {
    if (!touched.current) return;
    const timer = setTimeout(() => {
      const name = catalog.characters.find((entry) => entry.id === build.char)?.name ?? "Manual build";
      saveManualDraft({ game, charId: build.char, name, build });
      setSavedAt(Date.now());
    }, 700);
    return () => clearTimeout(timer);
  }, [build, catalog.characters, game]);

  const needle = filter.trim().toLowerCase();
  const characters = needle
    ? catalog.characters.filter((entry) => entry.name.toLowerCase().includes(needle))
    : catalog.characters;
  const shareUrl = `${origin}/${game}/manual?b=${encoded}`;
  const pngUrl = `/api/card/${game}/manual?b=${encoded}&download=1`;
  const sheetUrl = `/api/card/${game}/manual?b=${encoded}&view=detail&download=1`;
  const portraitUrl = `/api/card/${game}/manual?b=${encoded}&view=portrait&download=1`;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-4">
        <section className="panel p-4">
          <p className="label">Character</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-faint">Search</span>
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter by name"
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-faint">
                Character
              </span>
              <select
                value={build.char}
                onChange={(event) => update({ char: event.target.value })}
                className={FIELD}
              >
                {characters.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} · {entry.rarity}★
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-faint">Level</span>
              <input
                type="number"
                min={1}
                max={catalog.maxLevel}
                value={build.level}
                onChange={(event) =>
                  update({
                    level: Math.min(
                      catalog.maxLevel,
                      Math.max(1, Number(event.target.value) || 1),
                    ),
                  })
                }
                className={`${FIELD} num`}
              />
            </label>
            {game === "zzz" ? (
              <label className="block">
                <span className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-faint">
                  Promotion
                </span>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={build.promotion}
                  onChange={(event) =>
                    update({ promotion: Math.min(6, Math.max(0, Number(event.target.value) || 0)) })
                  }
                  className={`${FIELD} num`}
                />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-faint">
                {catalog.rankLabel}
              </span>
              <input
                type="number"
                min={0}
                max={catalog.rankMax}
                value={build.rank}
                onChange={(event) =>
                  update({ rank: Math.min(catalog.rankMax, Math.max(0, Number(event.target.value) || 0)) })
                }
                className={`${FIELD} num`}
              />
            </label>
          </div>
        </section>

        <section className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="label">{game === "zzz" ? "W-Engine" : "Light Cone"}</p>
            <span className="text-[10px] text-faint">stats go straight into the panel</span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,2fr)_80px_80px]">
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-faint">Engine</span>
              <select
                value={build.weapon}
                onChange={(event) => update({ weapon: event.target.value })}
                className={FIELD}
              >
                <option value="">None</option>
                {catalog.weapons.map((weapon) => (
                  <option key={weapon.id} value={weapon.id}>
                    {weapon.name} · {weapon.rarity}★ · {weapon.subtitle}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-faint">Level</span>
              <input
                type="number"
                min={1}
                max={catalog.maxLevel}
                value={build.weaponLevel}
                onChange={(event) =>
                  update({
                    weaponLevel: Math.min(catalog.maxLevel, Math.max(1, Number(event.target.value) || 1)),
                  })
                }
                className={`${FIELD} num`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-faint">
                {game === "zzz" ? "Effect" : "Imposition"}
              </span>
              <input
                type="number"
                min={1}
                max={5}
                value={build.weaponRank}
                onChange={(event) =>
                  update({ weaponRank: Math.min(5, Math.max(1, Number(event.target.value) || 1)) })
                }
                className={`${FIELD} num`}
              />
            </label>
          </div>
          <div className="mt-2">
            <p className="mb-1 text-[10.5px] uppercase tracking-[0.1em] text-faint">Engine stats</p>
            <StatLines
              lines={build.weaponStats}
              options={options}
              onChange={(weaponStats) => update({ weaponStats })}
              max={8}
              addLabel="engine stat"
            />
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-faint">
              {game === "zzz"
                ? "Enter base ATK plus any crit, DMG or attack bonuses the engine gives you."
                : "Add the light cone's base HP/ATK/DEF with “Base HP/ATK/DEF”, then any % bonuses it grants."}
            </p>
          </div>
        </section>

        <section className="panel space-y-2.5 p-4">
          <p className="label">{game === "zzz" ? "Drive discs" : "Relics"}</p>
          {build.pieces.map((piece) => (
            <div key={piece.slot} className="rounded-lg border border-white/[0.07] bg-black/25 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] text-white/85">{catalog.slots[piece.slot - 1]}</p>
                <label className="flex items-center gap-1 text-[10px] text-faint">
                  <span>+</span>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={piece.level}
                    onChange={(event) =>
                      updatePiece(piece.slot, {
                        level: Math.min(15, Math.max(0, Number(event.target.value) || 0)),
                      })
                    }
                    className={`${FIELD} num w-14 px-1.5 py-1`}
                    aria-label="Gear level"
                  />
                </label>
              </div>

              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <select
                  value={piece.set}
                  onChange={(event) => updatePiece(piece.slot, { set: event.target.value })}
                  className={FIELD}
                  aria-label="Set"
                >
                  <option value="">No set</option>
                  {catalog.sets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <select
                    value={piece.main?.k ?? ""}
                    onChange={(event) =>
                      updatePiece(piece.slot, {
                        main: event.target.value ? { k: event.target.value, v: piece.main?.v ?? 0 } : null,
                      })
                    }
                    className={FIELD}
                    aria-label="Main stat"
                  >
                    <option value="">— main stat —</option>
                    {options.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="any"
                    value={piece.main ? (Number.isFinite(piece.main.v) ? piece.main.v : 0) : 0}
                    onChange={(event) =>
                      updatePiece(piece.slot, {
                        main: piece.main
                          ? { ...piece.main, v: Number(event.target.value) || 0 }
                          : null,
                      })
                    }
                    disabled={!piece.main}
                    className={`${FIELD} num w-20 shrink-0 disabled:opacity-40`}
                    aria-label="Main stat value"
                  />
                </div>
              </div>

              <div className="mt-2">
                <p className="mb-1 text-[10.5px] uppercase tracking-[0.1em] text-faint">Sub stats</p>
                <StatLines
                  lines={piece.subs}
                  options={options}
                  onChange={(subs) => updatePiece(piece.slot, { subs })}
                  max={4}
                  addLabel="sub stat"
                />
              </div>
            </div>
          ))}
        </section>

        <section className="panel p-4">
          <p className="label">Extra stats</p>
          <p className="mt-1 text-[10.5px] text-faint">
            Set bonuses, buffs or passives you want counted. {game === "hsr" ? "Traces too." : ""}
          </p>
          <div className="mt-2">
            <StatLines
              lines={build.extras}
              options={options}
              onChange={(extras) => update({ extras })}
              max={12}
              addLabel="extra stat"
            />
          </div>
        </section>

        <section className="panel p-4">
          <p className="label">Card title</p>
          <input
            value={build.nickname}
            onChange={(event) => update({ nickname: event.target.value.slice(0, 42) })}
            placeholder="Shown in the card footer"
            className={`${FIELD} mt-2`}
          />
        </section>
      </div>

      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <div className="panel overflow-hidden">
          {character ? (
            <>
              <div
                className="relative overflow-hidden px-4 pb-3 pt-4"
                style={{ background: `radial-gradient(120% 90% at 90% 0%, ${character.accent}26, transparent 62%)` }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/50">
                    {character.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={character.icon} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-[16px] font-semibold">{character.name}</p>
                      <Stars count={character.rarity} className="text-[#ffd977]" />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted">
                      <span className="num">Lv.{character.level}</span>
                      <span className="text-white/15">/</span>
                      <span style={{ color: character.elementColor }}>{character.element}</span>
                      <span className="text-white/15">/</span>
                      <span>
                        {character.kind === "zzz" ? character.profession : character.pathName}
                      </span>
                    </p>
                  </div>
                </div>

                <StatGrid rows={character.sheet.slice(0, 8)} className="mt-3" />

                {character.weapon || character.sets.length ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {character.sets.slice(0, 3).map((set) => (
                      <span
                        key={set.id}
                        className="inline-flex items-center gap-1 rounded-sm border border-white/[0.07] bg-black/40 py-1 pl-1 pr-2 text-[10px] text-white/70"
                        title={set.bonus.join(" · ")}
                      >
                        {set.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={set.icon} alt="" className="h-3.5 w-3.5" />
                        ) : null}
                        {set.pieces}pc {set.name}
                      </span>
                    ))}
                    {character.weapon ? (
                      <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/[0.07] bg-black/40 py-1 pl-1 pr-2 text-[10px] text-white/70">
                        {character.weapon.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={character.weapon.icon} alt="" className="h-3.5 w-3.5" />
                        ) : null}
                        <span className="max-w-[9rem] truncate">{character.weapon.name}</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-white/[0.07] px-4 py-3">
                <p className="text-[10.5px] leading-relaxed text-faint">
                  {character.sheet.length} stat rows · {character.gear.length}/6 gear pieces. Panels are
                  recomputed from your numbers as you type.
                </p>
              </div>
            </>
          ) : (
            <div className="p-5 text-[12px] text-faint">
              Pick a character to start. If the panel stays empty, check your level and stats.
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={pngUrl} className="btn btn-primary px-3.5 py-2 text-[12px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download card
          </a>
          <a href={sheetUrl} className="btn btn-ghost px-3.5 py-2 text-[12px]">
            Full sheet
          </a>
          <a href={portraitUrl} className="btn btn-ghost px-3.5 py-2 text-[12px]">
            Portrait
          </a>
          <CopyButton value={shareUrl} label="Copy build link" />
          <button
            type="button"
            onClick={() => setBuild(initialBuild)}
            className="btn btn-ghost px-3 py-2 text-[12px]"
          >
            Reset
          </button>
          {savedAt ? (
            <span className="self-center text-[10.5px] text-[#7cf5d0]">Saved in this browser</span>
          ) : null}
        </div>

        <p className="text-[11px] leading-relaxed text-faint">
          The build lives in the link, so anyone who opens it gets the same card. Percent stats take
          the number you see in game — type <span className="num">43.2</span> for 43.2%.
        </p>
        <p className="text-[11px] leading-relaxed text-faint">
          Not what you wanted?{" "}
          <Link href={`/${game}/${GAMES[game].example}`} className="text-white/70 underline decoration-dotted underline-offset-2 hover:text-white">
            See a showcase card
          </Link>{" "}
          instead.
        </p>
      </div>
    </div>
  );
}
