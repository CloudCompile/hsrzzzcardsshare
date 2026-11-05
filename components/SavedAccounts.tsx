"use client";

import Link from "next/link";
import { GAMES } from "@/lib/site";
import { relativeTime } from "@/lib/format";
import { useAccounts } from "@/lib/accounts";

/** Saved UIDs, shown under the lookup form so a returning visit is one click. */
export function SavedAccounts() {
  const { accounts, remove, hydrated } = useAccounts();

  if (!hydrated || !accounts.length) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="label">Saved accounts</p>
        <span className="text-[10.5px] text-faint">stored in this browser</span>
      </div>
      <ul className="mt-2 grid gap-1.5">
        {accounts.map((account) => {
          const accent = GAMES[account.game].accent;
          return (
            <li
              key={account.id}
              className="flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-2"
            >
              <span
                className="clip-tag px-1.5 py-1 font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-black"
                style={{ background: accent }}
              >
                {GAMES[account.game].short}
              </span>
              <Link href={`/${account.game}/${account.uid}`} className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-white/90">
                  {account.nickname || `UID ${account.uid}`}
                </p>
                <p className="num text-[10px] text-faint">
                  {account.uid} · {relativeTime(account.lastSeenAt)}
                </p>
              </Link>
              <Link
                href={`/agent?game=${account.game}&uid=${account.uid}`}
                className="btn btn-ghost px-2 py-1 text-[10.5px]"
              >
                Agent
              </Link>
              <button
                type="button"
                onClick={() => remove(account.id)}
                aria-label={`Remove ${account.nickname || account.uid}`}
                className="btn btn-ghost h-[26px] w-[26px] p-0 text-[10px]"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
