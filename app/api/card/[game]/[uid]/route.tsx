import { ImageResponse } from "next/og";
import { getShowcase, normalizeUid } from "@/lib/enka";
import { buildManualProfile, manualCatalog } from "@/lib/manual";
import { decodeBuild } from "@/lib/manualCodec";
import { CardFrame, SplashArt, detailCard, portraitCard, singleCard } from "@/lib/cards/detail";
import { applyCharacterEdit, decodeEdits, singleEdit } from "@/lib/edits";
import { teamCard } from "@/lib/cards/team";
import { GAMES, TEAM_SIZE, isGame } from "@/lib/site";
import type { Character, Game, ShowcaseProfile } from "@/lib/types";

export const runtime = "nodejs";

const BG = "#07070c";

function safeName(value: string, fallback: string): string {
  const cleaned = value.replace(/[^\x20-\x7E]/g, "").trim();
  return cleaned.length ? cleaned : fallback;
}





function uidLabel(profile: ShowcaseProfile): string {
  return profile.player.uid === "manual" ? "MANUAL BUILD" : `UID ${profile.player.uid}`;
}


function FallbackImage(message: string) {
  const width = 1200;
  const height = 630;
  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BG,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: "#7cf5d0" }}>ASTRA</div>
        <div style={{ display: "flex", fontSize: 24, color: "#8f8fa6", marginTop: 16 }}>{safeName(message, "Card unavailable")}</div>
      </div>
    ),
    { width, height },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ game: string; uid: string }> },
) {
  const { game, uid } = await context.params;
  const url = new URL(request.url);

  if (!isGame(game)) return FallbackImage("Unknown game");

  const download = url.searchParams.get("download") === "1";
  const viewParam = url.searchParams.get("view");
  const detail = viewParam === "detail";
  const portrait = viewParam === "portrait";

  // Manual builds reuse these renderers: the whole build rides along in the URL.
  if (uid === "manual") {
    const catalog = manualCatalog(game);
    const build = decodeBuild(url.searchParams.get("b"), {
      game,
      char: catalog.characters[0]?.id ?? "",
      level: catalog.maxLevel,
    });
    const manualProfile = buildManualProfile(game, build);
    const manualCharacter = manualProfile?.characters[0];
    if (!manualProfile || !manualCharacter) return FallbackImage("Manual card unavailable");

    const card = portrait
      ? portraitCard({ character: manualCharacter, profile: manualProfile, game })
      : detail
        ? detailCard({ character: manualCharacter, profile: manualProfile, game })
        : singleCard({ character: manualCharacter, profile: manualProfile, game });
    if (download) {
      const slug = manualCharacter.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const suffix = portrait ? "-portrait" : detail ? "-detail" : "";
      card.headers.set(
        "content-disposition",
        `attachment; filename="astra-${game}-manual-${slug}${suffix}.png"`,
      );
      card.headers.set("cache-control", "no-store, max-age=0");
    } else {
      card.headers.set("cache-control", "public, max-age=0, s-maxage=60");
    }
    return card;
  }

  const normalized = normalizeUid(uid);
  if (!normalized) return FallbackImage("Invalid UID");

  let profile: ShowcaseProfile;
  try {
    profile = await getShowcase(game, normalized);
  } catch {
    return FallbackImage("Showcase unavailable right now");
  }

  const agentId = url.searchParams.get("agent");
  const teamParam = url.searchParams.get("team");
  const title = url.searchParams.get("title") ?? "";
  // A download can carry the browser's local corrections; share links never do.
  const editRaw = url.searchParams.get("e");
  const localEdit = editRaw ? singleEdit(decodeEdits(editRaw)) : null;

  let response: ImageResponse;
  let filename = `astra-${game}-${normalized}.png`;

  if (agentId) {
    const character = applyCharacterEdit(
      profile.characters.find((item) => item.id === agentId) ?? profile.characters[0],
      localEdit,
    );
    response = portrait
      ? portraitCard({ character, profile, game })
      : detail
        ? detailCard({ character, profile, game })
        : singleCard({ character, profile, game });
    filename = `astra-${game}-${normalized}-${character.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}${portrait ? "-portrait" : detail ? "-detail" : ""}.png`;
  } else if (teamParam) {
    const ids = teamParam.split(",").map((value) => value.trim()).filter(Boolean);
    const members = ids
      .map((id) => profile.characters.find((character) => character.id === id))
      .filter((character): character is Character => Boolean(character));
    response = teamCard({ members, profile, game, title });
    filename = `astra-${game}-${normalized}-team.png`;
  } else {
    response = ProfileCardImage({ profile, game });
  }

  if (download) {
    response.headers.set("content-disposition", `attachment; filename="${filename}"`);
    // Without this the platform serves the PNG immutable for a year, so a redrawn
    // card keeps coming back as the old image long after a deploy.
    response.headers.set("cache-control", "no-store, max-age=0");
  } else {
    response.headers.set("cache-control", "public, max-age=0, s-maxage=180, stale-while-revalidate=600");
  }

  return response;
}

/**
 * Profile card: the top character's art runs under the account summary, with the
 * roster as a glass strip, so the account image matches the character cards.
 */
function ProfileCardImage({ profile, game }: { profile: ShowcaseProfile; game: Game }) {
  const width = 1200;
  const height = 630;
  const accent = GAMES[game].accent;
  const shown = profile.characters.slice(0, 8);
  const hero = profile.characters[0];

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          backgroundColor: BG,
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {hero ? <SplashArt character={hero} width={width} height={height} focus={hero.kind === "zzz" ? 0.03 : 0} /> : null}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(7,7,12,0.95) 0%, rgba(7,7,12,0.86) 32%, rgba(7,7,12,0.46) 58%, rgba(7,7,12,0.18) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(7,7,12,0.82) 0%, rgba(7,7,12,0.12) 18%, rgba(7,7,12,0) 34%, rgba(7,7,12,0.72) 70%, #07070c 100%)",
          }}
        />
        <CardFrame width={width} height={height} accent={accent} />

        <div style={{ display: "flex", flexDirection: "column", padding: 36, height }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", width: 10, height: 10, borderRadius: 3, backgroundColor: accent, marginRight: 10 }} />
              <div style={{ display: "flex", fontSize: 15, letterSpacing: 6, fontWeight: 700 }}>ASTRA</div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 11,
                letterSpacing: 2,
                color: "#d7d5e4",
                padding: "5px 10px",
                borderRadius: 6,
                backgroundColor: "rgba(6,6,11,0.66)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {`${GAMES[game].short} · ${uidLabel(profile)}`}
            </div>
          </div>

          <div style={{ display: "flex", flexGrow: 1 }} />

          <div style={{ display: "flex", fontSize: 62, fontWeight: 700, lineHeight: 1, letterSpacing: -1.5 }}>
            {safeName(profile.player.nickname, "Showcase")}
          </div>
          <div style={{ display: "flex", fontSize: 13, color: "#a8a4bb", marginTop: 8, letterSpacing: 1 }}>
            {`Level ${profile.player.level} · ${profile.characters.length} on showcase`}
          </div>

          <div style={{ display: "flex", marginTop: 18 }}>
            {shown.map((character) => (
              <div
                key={character.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 9px",
                  marginRight: 8,
                  borderRadius: 8,
                  background: "rgba(8,8,15,0.6)",
                  border: "1px solid rgba(255,255,255,0.085)",
                }}
              >
                {character.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.icon}
                    width={30}
                    height={30}
                    style={{ borderRadius: 999, marginRight: 8, objectFit: "cover" }}
                  />
                ) : null}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 12, color: "#e8e5f2" }}>{safeName(character.name, "—")}</div>
                  <div style={{ display: "flex", fontSize: 9.5, color: character.elementColor }}>
                    {`Lv.${character.level} · ${character.element}`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.09)",
              marginTop: 16,
              paddingTop: 10,
              fontSize: 11,
              color: "#7c7893",
            }}
          >
            <div style={{ display: "flex" }}>{`${GAMES[game].label} showcase · astra`}</div>
            <div style={{ display: "flex" }}>{`${profile.characters.length} carded`}</div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
