"use client";

import { useState } from "react";
import { CARD_VERSION } from "@/lib/site";
import { editParam, type EditMap } from "@/lib/edits";
import { createZip, type ZipEntry } from "@/lib/zip";
import type { Character, Game } from "@/lib/types";

/** Every card shape the app renders for a character, plus the profile card. */
const FORMATS = [
  { view: null, label: "" },
  { view: "portrait", label: "portrait" },
  { view: "detail", label: "sheet" },
] as const;

// A phone browser refuses a burst of separate downloads, so the PNGs are packed
// into one archive instead of clicked one after another.
const CONCURRENCY = 3;

function slug(value: string, fallback: string) {
  const cleaned = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

export function DownloadAll({
  game,
  uid,
  characters,
  edits,
  className = "",
}: {
  game: Game;
  uid: string;
  characters: Character[];
  edits: EditMap;
  className?: string;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = progress !== null;

  const jobs = [
    // The profile card first, then two-digit prefixes so agents stay in roster order.
    { name: "00-profile.png", url: `/api/card/${game}/${uid}?download=1&v=${CARD_VERSION}` },
    ...characters.flatMap((character, index) => {
      const correction = editParam(edits[character.id]);
      const suffix = correction ? `&e=${correction}` : "";
      const name = `${String(index + 1).padStart(2, "0")}-${slug(character.name, `agent-${character.id}`)}`;
      return FORMATS.map((format) => ({
        name: `${name}${format.label ? `-${format.label}` : ""}.png`,
        url: `/api/card/${game}/${uid}?agent=${character.id}${
          format.view ? `&view=${format.view}` : ""
        }&download=1${suffix}&v=${CARD_VERSION}`,
      }));
    }),
  ];

  async function download() {
    setError(null);
    setProgress({ done: 0, total: jobs.length });

    const entries: ZipEntry[] = [];
    const queue = [...jobs];
    let done = 0;

    async function worker() {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        const response = await fetch(job.url);
        if (!response.ok) throw new Error(`${job.name} failed (${response.status})`);
        entries.push({ name: job.name, data: await response.arrayBuffer() });
        done += 1;
        setProgress({ done, total: jobs.length });
      }
    }

    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => worker()),
      );

      const href = URL.createObjectURL(createZip(entries.sort((a, b) => a.name.localeCompare(b.name))));
      const link = document.createElement("a");
      link.href = href;
      link.download = `astra-${game}-${uid}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoking straight away can cancel the save in Safari.
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build the archive");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="btn btn-primary w-full px-3 py-2.5 text-[12px] disabled:opacity-70 sm:w-auto sm:py-2"
        title={
          characters.length
            ? `All ${FORMATS.length} formats for ${characters.length} ${
                game === "zzz" ? "agents" : "characters"
              }, plus the profile card`
            : "Profile card"
        }
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? `Packing ${progress.done}/${progress.total}` : "Download all formats"}
      </button>
      {error ? <p className="mt-1 text-[11px] text-[#ff8f80]">{error}</p> : null}
    </div>
  );
}
