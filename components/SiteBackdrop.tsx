"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GAME_BACKDROP, GAMES } from "@/lib/site";
import type { Game } from "@/lib/types";

function isGame(value: string | null | undefined): value is Game {
  return value === "zzz" || value === "hsr";
}

/**
 * Site-wide backdrop. Whichever game's section you are in puts that game's standing
 * splash behind everything, dimmed and masked into the page so the content stays
 * the thing you read rather than the art competing with it.
 */
export function SiteBackdrop() {
  const pathname = usePathname();
  const [queryGame, setQueryGame] = useState<Game | null>(null);

  // /agent names its game in the query string; every other route carries it in the path.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("game");
    setQueryGame(isGame(value) ? value : null);
  }, [pathname]);

  const segment = pathname?.split("/")[1];
  const game: Game | null = isGame(segment) ? segment : queryGame;
  const art = game ? GAME_BACKDROP[game] : null;
  const accent = game ? GAMES[game].accent : "#a98bff";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {art ? (
        // Phones get the art as a band across the top: a 2:1 splash stretched over a
        // tall viewport is cropped to an unrecognisable smear, so it keeps its width
        // instead and the page fades up into it. Wider screens fill the viewport.
        <div
          className="absolute inset-x-0 top-0 h-[64vh] sm:inset-0 sm:h-full"
          style={{
            maskImage: "linear-gradient(100deg, transparent 0%, rgba(0,0,0,0.55) 28%, #000 68%)",
            WebkitMaskImage: "linear-gradient(100deg, transparent 0%, rgba(0,0,0,0.55) 28%, #000 68%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={art}
            src={art}
            alt=""
            decoding="async"
            className="h-full w-full max-w-none object-cover object-[58%_32%] opacity-[0.42] sm:object-[58%_30%]"
          />
        </div>
      ) : null}
      {/* Game light, so even the art-less routes carry the section's colour. */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(85% 60% at 78% -10%, ${accent}26, transparent 68%)` }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-void/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[55vh] bg-gradient-to-b from-transparent via-void/70 to-void" />
      {/* Softens the band's lower edge on phones; the viewport scrim above covers wider screens. */}
      <div className="absolute inset-x-0 top-[32vh] h-[32vh] bg-gradient-to-b from-transparent via-void/60 to-void sm:hidden" />
    </div>
  );
}
