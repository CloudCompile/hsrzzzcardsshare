import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { ERROR_COPY, errorFromUnknown, getShowcase, normalizeUid } from "@/lib/enka";
import { GAMES, isGame } from "@/lib/site";

export const revalidate = 180;

interface PageProps {
  params: Promise<{ game: string; uid: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { game, uid } = await params;
  if (!isGame(game)) return {};
  const normalized = normalizeUid(uid);
  if (!normalized) return {};

  try {
    const profile = await getShowcase(game, normalized);
    const top = profile.characters
      .slice(0, 4)
      .map((character) => character.name)
      .join(", ");
    const title = `${profile.player.nickname} · ${GAMES[game].short} showcase`;
    const description = `${profile.characters.length} ${
      game === "zzz" ? "agents" : "characters"
    } on showcase${top ? ` — ${top}` : ""}. Stats, gear and team cards.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: `/api/card/${game}/${normalized}`, width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`/api/card/${game}/${normalized}`],
      },
    };
  } catch {
    return { title: `${GAMES[game].short} showcase` };
  }
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const { game, uid } = await params;
  const query = await searchParams;
  if (!isGame(game)) notFound();

  const normalized = normalizeUid(uid);
  if (!normalized) {
    return (
      <ErrorScreen
        game={game}
        uid={uid}
        title={ERROR_COPY.invalid.title}
        body={ERROR_COPY.invalid.body}
      />
    );
  }

  try {
    const profile = await getShowcase(game, normalized);
    const team = first(query.team)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const title = first(query.title);

    return (
      <main>
        <ProfileView
          profile={profile}
          game={game}
          uid={normalized}
          initialTeam={team}
          initialTitle={title}
        />
      </main>
    );
  } catch (error) {
    const showcaseError = errorFromUnknown(error);
    const copy = ERROR_COPY[showcaseError.code] ?? ERROR_COPY.upstream;
    return <ErrorScreen game={game} uid={normalized} title={copy.title} body={copy.body} />;
  }
}

function ErrorScreen({
  game,
  uid,
  title,
  body,
}: {
  game: "zzz" | "hsr";
  uid: string;
  title: string;
  body: string;
}) {
  const other = game === "zzz" ? "hsr" : "zzz";
  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-bg" />
      <div className="shell relative flex min-h-screen flex-col items-center justify-center py-16 text-center">
        <Link href="/" className="mb-10 flex items-center gap-2 text-[15px] font-display tracking-[0.1em]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2.6l2.5 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.6 6.5 19.7l1.4-6.3L3.1 9.1l6.4-.6z"
              fill="#7cf5d0"
            />
          </svg>
          ASTRA
        </Link>

        <div className="panel w-full max-w-lg p-7">
          <p className="label">
            {GAMES[game].short} · UID {uid || "—"}
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{body}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={`/${game}/${uid}`} className="btn btn-primary px-4 py-2 text-[12px]">
              Try again
            </Link>
            <Link href={`/${other}/${uid}`} className="btn btn-ghost px-4 py-2 text-[12px]">
              Try {GAMES[other].short} instead
            </Link>
            <Link href="/" className="btn btn-ghost px-4 py-2 text-[12px]">
              New UID
            </Link>
          </div>
        </div>

        <p className="mt-6 max-w-md text-[11px] leading-relaxed text-faint">
          Showcase data is read from Enka.Network. If you just changed your in-game showcase, give it
          a minute — the server caches results for a few minutes.
        </p>
      </div>
    </main>
  );
}
