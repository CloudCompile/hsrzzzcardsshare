/**
 * The fan-project notice. It lives in the root layout rather than on individual pages
 * so every route carries it — including the manual and agent screens, which have no
 * footer of their own.
 */
export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.06]">
      <div className="shell py-6 text-[11px] leading-relaxed text-faint">
        <p className="max-w-2xl">
          Fan site, not affiliated with or endorsed by HoYoverse. Zenless Zone Zero, Honkai: Star Rail and
          their characters are property of HoYoverse. Showcase data via{" "}
          <a
            href="https://enka.network"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
          >
            Enka.Network
          </a>
          ; game tables via the Enka API docs and{" "}
          <a
            href="https://github.com/Mar-7th/StarRailRes"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
          >
            StarRailRes
          </a>
          ; backdrop art from the official game sites. Everything Astra shows here is generated from your
          public in-game showcase.
        </p>
      </div>
    </footer>
  );
}
