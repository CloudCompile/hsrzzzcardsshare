"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "./CopyButton";
import { TeamCard } from "./TeamCard";
import { CARD_VERSION, TEAM_SIZE } from "@/lib/site";
import type { Character, Game } from "@/lib/types";

export function TeamBuilder({
  game,
  uid,
  characters,
  shareBase,
  initialTeam,
  initialTitle,
}: {
  game: Game;
  uid: string;
  characters: Character[];
  shareBase: string;
  initialTeam: string[];
  initialTitle: string;
}) {
  const size = TEAM_SIZE[game];
  const validIds = useMemo(() => new Set(characters.map((c) => c.id)), [characters]);
  const [picked, setPicked] = useState<string[]>(
    initialTeam.filter((id) => validIds.has(id)).slice(0, size),
  );
  const [title, setTitle] = useState(initialTitle || (game === "zzz" ? "Hollow Zero squad" : "Memory of Chaos"));

  const members = picked
    .map((id) => characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character));

  const query = new URLSearchParams();
  if (picked.length) query.set("team", picked.join(","));
  if (picked.length && title.trim()) query.set("title", title.trim());
  const shareUrl = `${shareBase}${query.toString() ? `?${query.toString()}` : ""}`;
  const pngUrl =
    `/api/card/${game}/${uid}?` +
    new URLSearchParams({
      ...(picked.length ? { team: picked.join(",") } : {}),
      ...(title.trim() ? { title: title.trim() } : {}),
      download: "1",
      v: CARD_VERSION,
    }).toString();

  // Keep the address bar in step with the lineup, so copying the profile URL shares this team.
  // A profile visit with no lineup built yet leaves the clean URL alone: this pane stays mounted
  // behind the characters tab, and writing the placeholder title here would silently turn every
  // profile link into one that opens on the team builder.
  const synced = useRef(false);
  useEffect(() => {
    if (!picked.length && !synced.current) return;
    synced.current = true;

    const params = new URLSearchParams(window.location.search);
    if (picked.length) params.set("team", picked.join(","));
    else params.delete("team");
    if (picked.length && title.trim()) params.set("title", title.trim());
    else params.delete("title");

    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [picked, title]);

  function toggle(id: string) {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= size) return [...current.slice(1), id];
      return [...current, id];
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="panel flex max-h-[560px] flex-col overflow-hidden">
        <div className="border-b border-white/[0.07] px-4 py-3">
          <p className="label">Pick your lineup</p>
          <p className="mt-1 text-[11.5px] text-faint">
            Select up to {size} characters from the showcase. {picked.length}/{size} selected.
          </p>
          <label className="mt-2.5 block">
            <span className="sr-only">Team name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 42))}
              placeholder="Team name"
              className="w-full rounded-md border border-white/10 bg-black/40 px-2.5 py-2 text-[12.5px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/25"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {characters.map((character) => {
            const active = picked.includes(character.id);
            return (
              <button
                key={character.id}
                type="button"
                onClick={() => toggle(character.id)}
                className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                  active
                    ? "border-white/25 bg-white/[0.08]"
                    : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/50">
                  {character.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.icon} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-white/90">{character.name}</p>
                  <p className="num text-[10px] text-faint">
                    Lv.{character.level} · {character.element}
                  </p>
                </div>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-[10px] ${
                    active
                      ? "border-transparent bg-[#7cf5d0] text-black"
                      : "border-white/15 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <TeamCard game={game} uid={uid} title={title} members={members} />
        <div className="flex flex-wrap gap-2">
          <a href={pngUrl} className="btn btn-primary px-3.5 py-2 text-[12px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download team card
          </a>
          <CopyButton value={shareUrl} label="Copy team link" />
        </div>
        <p className="text-[11px] leading-relaxed text-faint">
          Team cards use only the characters in your in-game showcase. Share the link and it rebuilds
          the exact same card for whoever opens it.
        </p>
      </div>
    </div>
  );
}
