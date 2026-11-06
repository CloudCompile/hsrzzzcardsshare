"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

/**
 * The page already renders its own screens for the errors Enka reports (private
 * showcase, unknown UID, upstream trouble). This catches everything else — a thrown
 * render, a bad payload, a network failure — instead of leaving Next's default screen.
 */
export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ game?: string; uid?: string }>();
  const game = params?.game === "hsr" ? "hsr" : "zzz";
  const other = game === "zzz" ? "hsr" : "zzz";
  const uid = typeof params?.uid === "string" ? params.uid.replace(/[^\d]/g, "") : "";
  const label = game === "zzz" ? "Zenless Zone Zero" : "Honkai: Star Rail";

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="shell relative flex min-h-screen flex-col items-center justify-center py-16 text-center">
        <div className="panel w-full max-w-lg p-7">
          <p className="label">
            {game.toUpperCase()} · UID {uid || "—"}
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold">That card didn&apos;t load</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Something broke while building your {label} card. Usually it&apos;s a dropped connection
            or Enka being briefly unavailable — a retry clears it.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={reset} className="btn btn-primary px-4 py-2 text-[12px]">
              Try again
            </button>
            {uid ? (
              <Link href={`/${other}/${uid}`} className="btn btn-ghost px-4 py-2 text-[12px]">
                Try {other.toUpperCase()} instead
              </Link>
            ) : null}
            <Link href="/" className="btn btn-ghost px-4 py-2 text-[12px]">
              New UID
            </Link>
          </div>
        </div>
        <p className="mt-6 max-w-md text-[11px] leading-relaxed text-faint">
          If your showcase is private in game, no card can be built from it — set it to public and
          try again.
        </p>
      </div>
    </main>
  );
}
