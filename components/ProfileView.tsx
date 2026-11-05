"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CharacterCard } from "./CharacterCard";
import { CharacterSheet } from "./CharacterSheet";
import { TeamBuilder } from "./TeamBuilder";
import { CopyButton } from "./CopyButton";
import { GAMES } from "@/lib/site";
import { fmtInt, relativeTime } from "@/lib/format";
import { accountId, touchAccount, useAccounts } from "@/lib/accounts";
import { applyCharacterEdit, type EditMap } from "@/lib/edits";
import { storeKey, useLocalStore } from "@/lib/storage";
import type { Character, Game, ShowcaseProfile } from "@/lib/types";

type SortKey = "level" | "rarity" | "name";

export function ProfileView({
  profile,
  game,
  uid,
  initialTeam,
  initialTitle,
}: {
  profile: ShowcaseProfile;
  game: Game;
  uid: string;
  initialTeam: string[];
  initialTitle: string;
}) {
  const router = useRouter();
  // A shared team link carries ?team= / ?title=, so it should open on the team builder rather than
  // the roster.
  const [tab, setTab] = useState<"characters" | "teams">(
    initialTeam.length || initialTitle ? "teams" : "characters",
  );
  const [selected, setSelected] = useState<Character | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("level");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Local corrections only ever touch this browser's copy of the card.
  const [edits] = useLocalStore<EditMap>(storeKey(`edits:${game}:${uid}`), {});
  const { accounts, save, remove } = useAccounts();
  const saved = accounts.some((account) => account.id === accountId(game, uid));

  const shareBase = `${origin || ""}/${game}/${uid}`;
  const { player, characters } = profile;
  const accent = GAMES[game].accent;

  const display = useMemo(
    () => characters.map((character) => applyCharacterEdit(character, edits[character.id])),
    [characters, edits],
  );

  useEffect(() => {
    touchAccount(accountId(game, uid), { nickname: player.nickname });
  }, [game, player.nickname, uid]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? display.filter((character) => character.name.toLowerCase().includes(needle))
      : display;
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "rarity") return b.rarity - a.rarity || a.name.localeCompare(b.name);
      return b.level - a.level || b.rarity - a.rarity || a.name.localeCompare(b.name);
    });
  }, [display, query, sort]);

  return (
    <div>
      <header className="relative overflow-hidden border-b border-white/[0.07]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(90% 130% at 15% -10%, ${accent}1f, transparent 58%), radial-gradient(70% 100% at 90% 0%, #a98bff1a, transparent 60%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />

        <div className="shell relative py-7 sm:py-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[11.5px] text-muted transition-colors hover:text-white"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5m0 0l6-6m-6 6l6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              New lookup
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  saved ? remove(accountId(game, uid)) : save(game, uid, player.nickname)
                }
                className={`btn btn-ghost px-3 py-2 text-[12px] ${saved ? "text-[#7cf5d0]" : ""}`}
              >
                {saved ? "★ Saved" : "☆ Save account"}
              </button>
              <CopyButton value={shareBase} label="Copy profile link" />
              <button
                type="button"
                onClick={() => router.refresh()}
                className="btn btn-ghost px-3 py-2 text-[12px]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Refresh
              </button>
              <a href={`/api/card/${game}/${uid}?download=1`} className="btn btn-primary px-3 py-2 text-[12px]">
                Download PNG
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="clip-tag px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-black"
                  style={{ background: accent }}
                >
                  {GAMES[game].short}
                </span>
                <span className="num rounded-sm border border-white/10 bg-black/40 px-2 py-1 text-[10.5px] tracking-[0.08em] text-white/60">
                  UID {uid}
                </span>
                {player.region ? (
                  <span className="rounded-sm border border-white/10 bg-black/40 px-2 py-1 text-[10.5px] uppercase tracking-[0.14em] text-white/50">
                    {player.region}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold leading-none sm:text-[42px]">
                {player.nickname}
              </h1>
              {player.signature ? (
                <p className="mt-2 max-w-xl text-[13px] italic leading-relaxed text-muted">
                  “{player.signature}”
                </p>
              ) : null}
            </div>

            <dl className="flex flex-wrap gap-x-6 gap-y-3">
              <Meta label="Level" value={fmtInt(player.level)} />
              {player.worldLevel !== undefined ? (
                <Meta label="World lvl" value={fmtInt(player.worldLevel)} />
              ) : null}
              <Meta label="Showcase" value={`${characters.length}`} />
              {player.achievements ? (
                <Meta label="Achievements" value={fmtInt(player.achievements)} />
              ) : null}
              <Meta label="Updated" value={relativeTime(player.updatedAt)} />
            </dl>
          </div>
        </div>
      </header>

      <div className="shell py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
            {[
              { key: "characters" as const, label: `Characters ${characters.length}` },
              { key: "teams" as const, label: "Team builds" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`btn px-3.5 py-1.5 text-[12px] ${
                  tab === item.key ? "bg-white/10 text-white" : "text-muted hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Link
            href={`/agent?game=${game}&uid=${uid}`}
            className="btn btn-ghost px-3 py-1.5 text-[12px]"
          >
            Ask the agent
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H8m9 0v9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {tab === "characters" ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search…"
                  className="w-36 rounded-md border border-white/10 bg-black/40 py-1.5 pl-7 pr-2 text-[12px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/25 sm:w-44"
                />
                <svg
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-white/30"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                </svg>
              </div>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                aria-label="Sort characters"
                className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[12px] text-white/80 outline-none focus:border-white/25"
              >
                <option value="level">Level</option>
                <option value="rarity">Rarity</option>
                <option value="name">Name</option>
              </select>
            </div>
          ) : null}
        </div>

        {/* Both panes stay mounted so switching tabs keeps a lineup you just picked. */}
        <div className={tab === "characters" ? "mt-5" : "mt-5 hidden"}>
          {visible.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((character) => (
                <CharacterCard key={character.id} character={character} onOpen={setSelected} />
              ))}
            </div>
          ) : (
            <div className="panel px-5 py-10 text-center text-[13px] text-muted">
              No characters match “{query}”.
            </div>
          )}
        </div>

        <div className={tab === "teams" ? "mt-5" : "mt-5 hidden"}>
          <TeamBuilder
            game={game}
            uid={uid}
            characters={display}
            shareBase={shareBase}
            initialTeam={initialTeam}
            initialTitle={initialTitle}
          />
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-faint">
          Data pulled live from your in-game showcase through Enka.Network. Cards only include the
          characters you pinned to your profile showcase. Astra is a fan project and isn&apos;t
          affiliated with HoYoverse.
        </p>
      </div>

      <CharacterSheet
        character={selected}
        game={game}
        uid={uid}
        shareUrl={shareBase}
        edit={selected ? edits[selected.id] ?? null : null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="num mt-1 text-[15px] font-medium text-white">{value}</dd>
    </div>
  );
}
