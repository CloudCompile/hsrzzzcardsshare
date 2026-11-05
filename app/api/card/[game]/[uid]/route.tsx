import { ImageResponse } from "next/og";
import { getShowcase, normalizeUid } from "@/lib/enka";
import { buildManualProfile, manualCatalog } from "@/lib/manual";
import { decodeBuild } from "@/lib/manualCodec";
import { detailCard, portraitCard } from "@/lib/cards/detail";
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

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{ display: "flex", fontSize: 17, color: "#8f8fa6", letterSpacing: 1 }}>{label}</div>
      <div style={{ display: "flex", fontSize: 20, color: "#ffffff", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Frame({
  accent,
  children,
  width,
  height,
}: {
  accent: string;
  children: React.ReactNode;
  width: number;
  height: number;
}) {
  return (
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
        padding: 44,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -220,
          left: -160,
          width: 900,
          height: 700,
          borderRadius: 999,
          background: `linear-gradient(120deg, ${accent}44, transparent)`,
          display: "flex",
        }}
      />
      {children}
    </div>
  );
}

function Brand({ accent, right }: { accent: string; right: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", width: 12, height: 12, borderRadius: 3, backgroundColor: accent, marginRight: 12 }} />
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, fontWeight: 700 }}>ASTRA</div>
      </div>
      <div style={{ display: "flex", fontSize: 18, color: "#7a7a92", letterSpacing: 2 }}>{right}</div>
    </div>
  );
}

function characterSize(character: Character): "zzz" | "hsr" {
  return character.kind;
}

function uidLabel(profile: ShowcaseProfile): string {
  return profile.player.uid === "manual" ? "MANUAL BUILD" : `UID ${profile.player.uid}`;
}

function SingleCard({
  character,
  profile,
  game,
}: {
  character: Character;
  profile: ShowcaseProfile;
  game: Game;
}) {
  const width = 1080;
  const height = 1350;
  const accent = character.accent;
  const top = character.sheet.slice(0, 8);

  return new ImageResponse(
    (
      <Frame accent={accent} width={width} height={height}>
        <Brand accent={accent} right={`${GAMES[game].short} · ${uidLabel(profile)}`} />

        <div style={{ display: "flex", alignItems: "center", marginTop: 48 }}>
          {character.icon ? (
            // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
            <img
              src={character.icon}
              width={168}
              height={168}
              style={{ borderRadius: 26, border: `2px solid ${accent}`, objectFit: "cover" }}
            />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 28, maxWidth: 700 }}>
            <div style={{ display: "flex", fontSize: 66, fontWeight: 700, lineHeight: 1 }}>
              {safeName(character.name, "Character")}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 16, fontSize: 24, color: "#b7b3c9" }}>
              <div style={{ display: "flex", alignItems: "center", marginRight: 14 }}>
                {Array.from({ length: character.rarity }).map((_, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      width: 13,
                      height: 13,
                      marginRight: 5,
                      backgroundColor: "#ffd977",
                      transform: "rotate(45deg)",
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", marginRight: 12 }}>{`Lv.${character.level}`}</div>
              <div style={{ display: "flex", color: accent }}>{character.element}</div>
              <div style={{ display: "flex", marginLeft: 12, color: "#7a7a92" }}>
                {character.kind === "zzz"
                  ? `${character.profession} · Core ${character.coreRank}`
                  : `${character.pathName} · E${character.eidolon}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 40 }}>
          {top.map((row) => (
            <div key={row.label} style={{ display: "flex", width: "50%", paddingRight: 14, paddingBottom: 14 }}>
              <div style={{ display: "flex", width: "100%" }}>
                <Pill label={row.label} value={row.value} />
              </div>
            </div>
          ))}
        </div>

        {character.weapon ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 12,
              padding: "16px 18px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {character.weapon.icon ? (
              // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
              <img
                src={character.weapon.icon}
                width={64}
                height={64}
                style={{ borderRadius: 12, objectFit: "cover", marginRight: 18 }}
              />
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22, color: "#ffffff" }}>{safeName(character.weapon.name, "Weapon")}</div>
              <div style={{ display: "flex", fontSize: 18, color: "#8f8fa6", marginTop: 6 }}>
                {`${character.kind === "zzz" ? "W-Engine" : "Light Cone"} · Lv.${character.weapon.level} · ${
                  character.kind === "zzz" ? `Effect ${character.weapon.effect}` : `S${character.weapon.effect}`
                }`}
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 16 }}>
          {character.sets.map((set) => (
            <div
              key={set.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 14px",
                marginRight: 10,
                marginBottom: 10,
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 18,
                color: "#cfcbdd",
              }}
            >
              {set.icon ? (
                // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
                <img src={set.icon} width={26} height={26} style={{ marginRight: 10, objectFit: "contain" }} />
              ) : null}
              {`${set.pieces}pc ${safeName(set.name, "Set")}`}
            </div>
          ))}
        </div>

        {character.gear.length ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
            <div style={{ display: "flex", fontSize: 15, letterSpacing: 3, color: "#6f6f86", marginBottom: 10 }}>
              {character.kind === "zzz" ? "DRIVE DISCS" : "RELICS"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {character.gear.map((piece) => (
                <div
                  key={piece.slot}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "50%",
                    paddingRight: 12,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 7,
                      background: "rgba(0,0,0,0.34)",
                      fontSize: 15,
                    }}
                  >
                    <div style={{ display: "flex", color: "#7a7a92", marginRight: 10 }}>{piece.slot}</div>
                    <div style={{ display: "flex", color: "#cfcbdd", marginRight: 8 }}>{piece.main.label}</div>
                    <div style={{ display: "flex", color: "#ffffff", marginLeft: "auto" }}>{piece.main.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", flexGrow: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 18,
            fontSize: 18,
            color: "#6f6f86",
          }}
        >
          <div style={{ display: "flex" }}>{safeName(profile.player.nickname, "Showcase")}</div>
          <div style={{ display: "flex" }}>
            {profile.player.uid === "manual" ? "Manual card" : "Showcase card"} ·{" "}
            {characterSize(character).toUpperCase()}
          </div>
        </div>
      </Frame>
    ),
    { width, height },
  );
}

function ProfileCardImage({ profile, game }: { profile: ShowcaseProfile; game: Game }) {
  const width = 1200;
  const height = 630;
  const accent = GAMES[game].accent;
  const shown = profile.characters.slice(0, 8);

  return new ImageResponse(
    (
      <Frame accent={accent} width={width} height={height}>
        <Brand accent={accent} right={`${GAMES[game].short} · ${uidLabel(profile)}`} />
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>
              {safeName(profile.player.nickname, "Showcase")}
            </div>
            <div style={{ display: "flex", fontSize: 20, color: "#8f8fa6", marginTop: 8 }}>
              {`Level ${profile.player.level} · ${profile.characters.length} on showcase`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 24, flexGrow: 1 }}>
          {shown.map((character) => (
            <div
              key={character.id}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 128,
                marginRight: 14,
                padding: 10,
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {character.icon ? (
                // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
                <img
                  src={character.icon}
                  width={104}
                  height={104}
                  style={{ borderRadius: 10, objectFit: "cover" }}
                />
              ) : null}
              <div style={{ display: "flex", fontSize: 16, marginTop: 8, color: "#e8e5f2" }}>
                {safeName(character.name, "—")}
              </div>
              <div style={{ display: "flex", fontSize: 14, color: character.elementColor }}>
                {`Lv.${character.level} · ${character.element}`}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 17, color: "#6f6f86", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
          {`${GAMES[game].label} showcase · astra`}
        </div>
      </Frame>
    ),
    { width, height },
  );
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
        : SingleCard({ character: manualCharacter, profile: manualProfile, game });
    if (download) {
      const slug = manualCharacter.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const suffix = portrait ? "-portrait" : detail ? "-detail" : "";
      card.headers.set(
        "content-disposition",
        `attachment; filename="astra-${game}-manual-${slug}${suffix}.png"`,
      );
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
        : SingleCard({ character, profile, game });
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
  } else {
    response.headers.set("cache-control", "public, max-age=0, s-maxage=180, stale-while-revalidate=600");
  }

  return response;
}
