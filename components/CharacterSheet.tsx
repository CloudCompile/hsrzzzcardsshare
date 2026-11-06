"use client";

import { useEffect } from "react";
import { CharacterCorrections } from "./CharacterCorrections";
import { Stars, StatGrid } from "./ui";
import { CopyButton } from "./CopyButton";
import { ShareButton } from "./ShareButton";
import { fmtInt } from "@/lib/format";
import { CARD_VERSION, GAMES } from "@/lib/site";
import { editParam, type CharacterEdit } from "@/lib/edits";
import type { Character, Game } from "@/lib/types";

export function CharacterSheet({
  character,
  game,
  uid,
  shareUrl,
  edit,
  onClose,
}: {
  character: Character | null;
  game: Game;
  uid: string;
  shareUrl: string;
  edit?: CharacterEdit | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!character) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [character, onClose]);

  if (!character) return null;

  const accent = character.accent;
  // Corrections ride along with the download only, never with the share URL.
  const corrections = editParam(edit);
  const suffix = corrections ? `&e=${corrections}` : "";
  const png = `/api/card/${game}/${uid}?agent=${character.id}&download=1${suffix}&v=${CARD_VERSION}`;
  const detailPng = `/api/card/${game}/${uid}?agent=${character.id}&view=detail&download=1${suffix}&v=${CARD_VERSION}`;
  const portraitPng = `/api/card/${game}/${uid}?agent=${character.id}&view=portrait&download=1${suffix}&v=${CARD_VERSION}`;
  const characterShare = `${shareUrl.split("?")[0]}?agent=${character.id}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <aside
        className="relative flex h-full w-full max-w-[560px] animate-fade-up flex-col overflow-y-auto border-l border-white/10 bg-[#08080f]"
        style={{ boxShadow: `-40px 0 120px -60px ${accent}` }}
      >
        <div className="relative shrink-0 overflow-hidden px-5 pb-5 pt-5">
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(120% 80% at 80% 0%, ${accent}33, transparent 65%)` }}
          />
          {character.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.portrait}
              alt=""
              className="absolute -right-6 -top-10 h-[150%] w-auto max-w-none opacity-30"
              style={{
                maskImage: "linear-gradient(90deg, transparent 20%, #000 70%)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 20%, #000 70%)",
              }}
            />
          ) : null}

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-black/60"
                style={{ boxShadow: `0 0 30px -8px ${accent}` }}
              >
                {character.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={character.icon} alt={character.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-semibold leading-none">{character.name}</h2>
                  <Stars count={character.rarity} className="text-[#ffd977]" />
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-muted">
                  <span className="num text-white/85">Lv.{fmtInt(character.level)}</span>
                  <span className="text-white/15">/</span>
                  <span style={{ color: accent }}>{character.element}</span>
                  <span className="text-white/15">/</span>
                  <span>{character.kind === "zzz" ? character.profession : character.pathName}</span>
                  <span className="text-white/15">/</span>
                  <span>
                    {character.kind === "zzz"
                      ? `Core ${character.coreRank} · M${character.mindscape}`
                      : `Eidolon ${character.eidolon}`}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost h-8 w-8 p-0 text-[14px]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <a href={png} className="btn btn-primary px-3 py-2 text-[12px]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download card
            </a>
            <a href={detailPng} className="btn btn-ghost px-3 py-2 text-[12px]">
              Full sheet
            </a>
            <a href={portraitPng} className="btn btn-ghost px-3 py-2 text-[12px]">
              Portrait
            </a>
            <CopyButton value={characterShare} label="Copy card link" />
            <ShareButton
              url={characterShare}
              title={`${character.name} · ${GAMES[game].short}`}
              text={`${character.name} from ${GAMES[game].label} on Astra`}
              file={{
                href: `/api/card/${game}/${uid}?agent=${character.id}${suffix}&v=${CARD_VERSION}`,
                filename: `astra-${game}-${character.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}.png`,
              }}
            />
            <a
              href={`/agent?game=${game}&uid=${uid}&focus=${character.id}`}
              className="btn btn-ghost px-3 py-2 text-[12px]"
            >
              Ask the agent
            </a>
          </div>
        </div>

        <div className="space-y-5 px-5 pb-10">
          <section>
            <h3 className="label mb-2">Stats</h3>
            <StatGrid rows={character.sheet} columns={2} />
            <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
              {character.kind === "zzz"
                ? "Calculated from agent level, promotion, core skill, W-Engine, drive discs and 2pc set bonuses. W-Engine passive effects are not included."
                : "Calculated from character level, light cone, traces, relics and set bonuses."}
            </p>
            <div className="mt-3">
              <CharacterCorrections character={character} game={game} uid={uid} />
            </div>
          </section>

          {character.weapon ? (
            <section>
              <h3 className="label mb-2">
                {character.kind === "zzz" ? "W-Engine" : "Light Cone"}
              </h3>
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50">
                  {character.weapon.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.weapon.icon} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white/90">{character.weapon.name}</p>
                  {character.weapon.stats?.length ? (
                    <p className="num mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-white/70">
                      {character.weapon.stats.map((stat) => (
                        <span key={stat.label}>
                          <span className="text-faint">{stat.label}</span> {stat.value}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                    <span className="num">Lv.{character.weapon.level}</span>
                    <span className="text-white/15">/</span>
                    <Stars count={character.weapon.rarity} className="text-[#ffd977]" />
                    <span className="text-white/15">/</span>
                    <span>
                      {character.kind === "zzz"
                        ? `W${character.weapon.modification ?? 1}`
                        : `S${character.weapon.effect}`}
                    </span>
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {character.sets.length ? (
            <section>
              <h3 className="label mb-2">{character.kind === "zzz" ? "Disc sets" : "Relic sets"}</h3>
              <div className="space-y-2">
                {character.sets.map((set) => (
                  <div
                    key={set.id}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
                      {set.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={set.icon} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-white/90">
                        <span className="num mr-1.5 text-white/45">{set.pieces}pc</span>
                        {set.name}
                      </p>
                      {set.bonus.length ? (
                        <ul className="mt-1 space-y-0.5 text-[11px] leading-snug text-muted">
                          {set.bonus.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {character.gear.length ? (
            <section>
              <h3 className="label mb-2">{character.kind === "zzz" ? "Drive discs" : "Relics"}</h3>
              <div className="space-y-2">
                {character.gear.map((piece) => (
                  <div
                    key={piece.slot}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/40">
                        {piece.icon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={piece.icon} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] text-white/90">{piece.name}</p>
                        <p className="num mt-0.5 text-[10.5px] text-faint">
                          {character.kind === "zzz" ? `Slot ${piece.slot}` : piece.slot} · +{piece.level}
                          {piece.rarity ? " · 5★" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between rounded-md border border-white/[0.06] bg-black/30 px-2 py-1.5">
                      <span className="text-[11px] text-muted">{piece.main.label}</span>
                      <span className="num text-[12px] font-semibold text-white">{piece.main.value}</span>
                    </div>
                    <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                      {piece.subs.map((sub, index) => (
                        <div
                          key={`${sub.label}-${index}`}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <dt className="truncate text-faint">{sub.label}</dt>
                          <dd className="num flex shrink-0 items-center gap-1 text-white/80">
                            {sub.value}
                            {sub.rolls && sub.rolls > 1 ? (
                              <span className="text-[9.5px] text-white/30">×{sub.rolls}</span>
                            ) : null}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
