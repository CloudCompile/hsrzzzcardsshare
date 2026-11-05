"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveAccount } from "@/lib/accounts";
import { GAMES } from "@/lib/site";
import type { Game } from "@/lib/types";

export function UidForm({ initialGame = "zzz" }: { initialGame?: Game }) {
  const router = useRouter();
  const [game, setGame] = useState<Game>(initialGame);
  const [uid, setUid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const active = GAMES[game];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const digits = uid.replace(/[^\d]/g, "");
    if (digits.length < 8 || digits.length > 10) {
      setError("UIDs are 8–10 digits — check your in-game profile.");
      return;
    }
    setError(null);
    // Looking a UID up saves it in this browser, so the agent and the home page can reuse it.
    saveAccount(game, digits);
    setPending(true);
    router.push(`/${game}/${digits}`);
  }

  return (
    <div className="w-full">
      <div className="mb-3 inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
        {(Object.keys(GAMES) as Game[]).map((key) => {
          const item = GAMES[key];
          const selected = game === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setGame(key);
                setError(null);
              }}
              className={`btn relative px-3.5 py-1.5 text-[12px] ${
                selected ? "text-black" : "text-muted hover:text-white"
              }`}
              style={
                selected
                  ? { background: item.accent, boxShadow: `0 0 24px -8px ${item.accent}` }
                  : undefined
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} className="relative">
        <div
          className="group relative flex items-center gap-2 rounded-xl border border-white/10 bg-[#0b0b13] p-1.5 pl-4 transition-colors focus-within:border-white/25"
          style={{ boxShadow: `0 20px 60px -40px ${active.accent}` }}
        >
          <span className="hidden select-none font-mono text-[11px] uppercase tracking-[0.2em] text-faint sm:block">
            UID
          </span>
          <input
            value={uid}
            onChange={(event) => {
              setUid(event.target.value.replace(/[^\d\s]/g, "").slice(0, 12));
              setError(null);
            }}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder={active.example}
            aria-label={`${active.label} UID`}
            className="num min-w-0 flex-1 bg-transparent py-2.5 text-[17px] tracking-[0.08em] text-white outline-none placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary shrink-0 px-4 py-2.5 text-[13px] disabled:opacity-70 sm:px-5"
          >
            {pending ? "Reading…" : "Build my cards"}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h13M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
        {error ? (
          <span className="text-[#ff8f7a]">{error}</span>
        ) : (
          <>
            <span>
              {active.uidLength} · showcase must be public in-game
            </span>
            <span className="hidden text-white/10 sm:inline">|</span>
            {/* Kept together so the sample UID never wraps apart from its label. */}
            <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
              <span>Try an example:</span>
              <button
                type="button"
                className="num underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
                onClick={() => {
                  setUid(active.example);
                  setError(null);
                }}
              >
                {active.example}
              </button>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
