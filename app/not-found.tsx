import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="panel relative w-full max-w-md p-8 text-center">
        <p className="label">Error 404</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Nothing here</h1>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          That page doesn&apos;t exist. Showcase links look like{" "}
          <span className="num text-white/80">/zzz/1300000579</span> or{" "}
          <span className="num text-white/80">/hsr/801010942</span>.
        </p>
        <Link href="/" className="btn btn-primary mt-6 px-4 py-2 text-[12px]">
          Back to Astra
        </Link>
      </div>
    </main>
  );
}
