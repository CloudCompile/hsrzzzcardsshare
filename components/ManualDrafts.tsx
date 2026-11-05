"use client";

import Link from "next/link";
import { relativeTime } from "@/lib/format";
import { encodeBuild } from "@/lib/manualCodec";
import { useManualDrafts } from "@/lib/manualDrafts";
import { GAMES } from "@/lib/site";
import type { Game } from "@/lib/types";

/** Builds saved in this browser. Opening one just reuses the normal `?b=` link. */
export function ManualDrafts({ game }: { game: Game }) {
  const { drafts, remove, rename, hydrated } = useManualDrafts(game);

  if (!hydrated || !drafts.length) return null;

  return (
    <section className="panel mt-5 p-4">
      <div className="flex items-center justify-between">
        <p className="label">Saved builds</p>
        <span className="text-[10.5px] text-faint">
          {drafts.length} in this browser · autosaved as you edit
        </span>
      </div>

      <ul className="mt-2 grid gap-1.5">
        {drafts.map((draft) => (
          <li
            key={`${draft.game}:${draft.charId}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2"
          >
            <span className="num rounded-sm border border-white/10 bg-black/40 px-1.5 py-0.5 text-[10px] text-white/60">
              Lv.{draft.build.level}
            </span>
            <input
              value={draft.name}
              onChange={(event) => rename(draft.charId, event.target.value)}
              aria-label="Build name"
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-[12.5px] text-white/90 outline-none transition-colors hover:border-white/10 focus:border-white/25"
            />
            <span className="text-[10px] text-faint">{relativeTime(draft.updatedAt)}</span>
            <Link
              href={`/${game}/manual?b=${encodeBuild(draft.build)}`}
              className="btn btn-ghost px-2.5 py-1 text-[10.5px]"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={() => remove(draft.charId)}
              aria-label={`Delete ${draft.name}`}
              className="btn btn-ghost h-[26px] w-[26px] p-0 text-[10px]"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
        Drafts live in this browser only. {GAMES[game].short} builds are keyed by character, so
        editing the same agent again updates the same draft.
      </p>
    </section>
  );
}
