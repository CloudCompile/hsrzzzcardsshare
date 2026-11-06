import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ManualBuilder } from "@/components/ManualBuilder";
import { ManualDrafts } from "@/components/ManualDrafts";
import { SiteNav } from "@/components/SiteNav";
import { buildManualProfile, manualCatalog, statOptions } from "@/lib/manual";
import { decodeBuild } from "@/lib/manualCodec";
import { ogImage } from "@/lib/meta";
import { GAMES, isGame } from "@/lib/site";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { game } = await params;
  if (!isGame(game)) return {};
  const query = await searchParams;
  const raw = Array.isArray(query.b) ? query.b[0] : query.b;
  const catalog = manualCatalog(game);
  const built = raw
    ? buildManualProfile(
        game,
        decodeBuild(raw, { game, char: catalog.characters[0]?.id ?? "", level: catalog.maxLevel }),
      )
    : null;
  const character = built?.characters[0] ?? null;

  // A shared build carries the build in the URL, so the preview can be that exact card.
  const title = character
    ? `${character.name} · manual ${GAMES[game].short} card`
    : `Manual ${GAMES[game].short} card builder`;
  const description = character
    ? `A hand-built ${GAMES[game].label} card for ${character.name} — stats, gear and a PNG export.`
    : `Type in your ${GAMES[game].label} gear and stats by hand and get the same shareable card and PNG export, no showcase needed.`;
  const image =
    raw && character
      ? {
          url: `/api/card/${game}/manual?b=${raw}`,
          width: 1200,
          height: 630,
          alt: `${character.name} manual card`,
        }
      : ogImage({ title, sub: description, game });

  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function ManualPage({ params, searchParams }: PageProps) {
  const { game } = await params;
  const query = await searchParams;
  if (!isGame(game)) notFound();

  const raw = Array.isArray(query.b) ? query.b[0] : query.b;
  const catalog = manualCatalog(game);
  const initialBuild = decodeBuild(raw, {
    game,
    char: catalog.characters[0]?.id ?? "",
    level: catalog.maxLevel,
  });
  const profile = buildManualProfile(game, initialBuild);

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[#a98bff]/[0.09] blur-[110px]" />
      </div>

      <div className="shell relative py-7">
        <SiteNav>
          <Link
            href="/zzz/manual"
            className={`btn px-2.5 py-1 text-[11px] ${game === "zzz" ? "btn-primary" : "btn-ghost"}`}
          >
            ZZZ
          </Link>
          <Link
            href="/hsr/manual"
            className={`btn px-2.5 py-1 text-[11px] ${game === "hsr" ? "btn-primary" : "btn-ghost"}`}
          >
            HSR
          </Link>
        </SiteNav>

        <div className="mt-6 max-w-2xl">
          <p className="label">{GAMES[game].short} · manual mode</p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-[38px]">
            Build the card by hand.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            No showcase pinned, or working on a build that isn&apos;t in game yet? Enter the character,
            W-Engine and every disc or relic yourself. Astra runs the same stat maths as the showcase
            cards, so the panel updates as you type and the PNG export matches.
          </p>
        </div>

        <ManualDrafts game={game} />

        <div className="mt-6">
          <ManualBuilder
            game={game}
            initialBuild={initialBuild}
            catalog={catalog}
            options={statOptions(game)}
            initialCharacter={profile?.characters[0] ?? null}
          />
        </div>
      </div>
    </main>
  );
}
