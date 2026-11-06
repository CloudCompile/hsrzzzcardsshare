"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="panel relative w-full max-w-md p-8 text-center">
        <p className="label">Something broke</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Astra hit an error</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          This page failed to render. Retrying is usually enough; your saved accounts and builds are
          in this browser and were not touched.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn btn-primary px-4 py-2 text-[12px]">
            Try again
          </button>
          <Link href="/" className="btn btn-ghost px-4 py-2 text-[12px]">
            Back to Astra
          </Link>
        </div>
      </div>
    </main>
  );
}
