/**
 * Shown while the showcase request is in flight. Enka can take a few seconds, and on a
 * phone the difference between a blank page and a frame that fills in is the whole
 * feeling of speed. Shapes mirror the real profile header and card grid.
 */
export default function ProfileLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <header className="relative overflow-hidden border-b border-white/[0.07]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="shell relative py-7 sm:py-9">
          <div className="flex items-center justify-between">
            <div className="h-[11px] w-24 rounded bg-white/[0.07]" />
            <div className="flex gap-2">
              <div className="h-8 w-24 rounded-md bg-white/[0.05]" />
              <div className="h-8 w-24 rounded-md bg-white/[0.05]" />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <div className="h-5 w-12 rounded-sm bg-white/[0.08]" />
            <div className="h-5 w-24 rounded-sm bg-white/[0.05]" />
            <div className="h-5 w-16 rounded-sm bg-white/[0.05]" />
          </div>
          <div className="mt-4 h-[30px] w-56 rounded bg-white/[0.09] sm:h-[40px]" />
          <div className="mt-3 h-[12px] w-72 max-w-full rounded bg-white/[0.05]" />

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            {[0, 1, 2, 3].map((index) => (
              <div key={index}>
                <div className="h-[9px] w-14 rounded bg-white/[0.05]" />
                <div className="mt-2 h-[14px] w-12 rounded bg-white/[0.07]" />
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="shell py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 w-52 rounded-lg bg-white/[0.05]" />
          <div className="h-8 w-28 rounded-md bg-white/[0.04]" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="panel h-[170px]" />
          ))}
        </div>
        <p className="mt-6 text-[11px] text-faint">Reading the showcase from Enka…</p>
      </div>
    </div>
  );
}
