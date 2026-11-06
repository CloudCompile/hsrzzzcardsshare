import { ImageResponse } from "next/og";
import { GAMES, TEAM_SIZE } from "@/lib/site";
import type { Character, Game, ShowcaseProfile, StatRow } from "@/lib/types";

const BG = "#07070c";

function safeName(value: string, fallback: string): string {
  const cleaned = value.replace(/[^\x20-\x7E]/g, "").trim();
  return cleaned.length ? cleaned : fallback;
}

function keyStats(character: Character): StatRow[] {
  const wanted =
    character.kind === "zzz"
      ? ["ATK", "CRIT Rate", "CRIT DMG"]
      : ["SPD", "CRIT Rate", "CRIT DMG"];
  return wanted
    .map((label) => character.sheet.find((row) => row.label === label))
    .filter((row): row is StatRow => Boolean(row))
    .slice(0, 2);
}

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: "flex" }}>
      {Array.from({ length: Math.max(0, Math.min(5, count)) }).map((_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            width: 8,
            height: 8,
            marginRight: 4,
            borderRadius: 2,
            backgroundColor: "#ffd977",
            transform: "rotate(45deg)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Team card: soft capsules with full-bleed art instead of a grid of boxes.
 */
export function teamCard({
  members,
  profile,
  game,
  title,
}: {
  members: Character[];
  profile: ShowcaseProfile;
  game: Game;
  title: string;
}): ImageResponse {
  const width = 1200;
  const height = 675;
  const accent = GAMES[game].accent;
  const size = TEAM_SIZE[game];
  const gap = 14;
  const slotWidth = Math.floor((width - 68 - gap * (size - 1)) / size);
  const slotHeight = 404;

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
          padding: 34,
          overflow: "hidden",
        }}
      >
        {/* Soft glow blobs, no straight edges */}
        <div
          style={{
            position: "absolute",
            top: -320,
            left: -220,
            width: 900,
            height: 860,
            borderRadius: 999,
            display: "flex",
            background: `linear-gradient(135deg, ${accent}44, transparent 68%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -380,
            right: -240,
            width: 900,
            height: 900,
            borderRadius: 999,
            display: "flex",
            background: "linear-gradient(215deg, rgba(169,139,255,0.32), transparent 66%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 820 }}>
            <div style={{ display: "flex" }}>
              <div
                style={{
                  display: "flex",
                  padding: "5px 13px",
                  borderRadius: 999,
                  backgroundColor: `${accent}22`,
                  color: accent,
                  fontSize: 12,
                  letterSpacing: 2,
                }}
              >
                {`${GAMES[game].short} TEAM`}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 40,
                fontWeight: 700,
                marginTop: 12,
                lineHeight: 1.05,
              }}
            >
              {safeName(title, "Team build")}
            </div>
            <div style={{ display: "flex", fontSize: 15, color: "#8f8fa6", marginTop: 8 }}>
              {`${safeName(profile.player.nickname, "Showcase")} · ${GAMES[game].label}`}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: 9,
                height: 9,
                borderRadius: 3,
                backgroundColor: accent,
                marginRight: 9,
              }}
            />
            <div style={{ display: "flex", fontSize: 16, letterSpacing: 5, fontWeight: 700 }}>ASTRA</div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 22 }}>
          {Array.from({ length: size }).map((_, index) => {
            const member = members[index];
            const marginRight = index === size - 1 ? 0 : gap;

            if (!member) {
              return (
                <div
                  key={`empty-${index}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    width: slotWidth,
                    height: slotHeight,
                    marginRight,
                    borderRadius: 30,
                    border: "1px dashed rgba(255,255,255,0.13)",
                    backgroundColor: "rgba(255,255,255,0.014)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      fontSize: 22,
                      color: "rgba(255,255,255,0.28)",
                    }}
                  >
                    +
                  </div>
                  <div
                    style={{
                      display: "flex",
                      marginTop: 12,
                      fontSize: 10,
                      letterSpacing: 3,
                      color: "#4f4f61",
                    }}
                  >
                    EMPTY SLOT
                  </div>
                </div>
              );
            }

            return (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  position: "relative",
                  width: slotWidth,
                  height: slotHeight,
                  marginRight,
                  borderRadius: 30,
                  overflow: "hidden",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.015))",
                }}
              >
                {member.portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.portrait}
                    width={slotWidth}
                    height={slotHeight}
                    style={{ objectFit: "cover", objectPosition: "center top", opacity: 0.72 }}
                  />
                ) : null}

                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: slotWidth,
                    height: slotHeight,
                    display: "flex",
                    background: `linear-gradient(180deg, ${member.accent}33 0%, rgba(7,7,12,0.45) 42%, rgba(7,7,12,0.94) 82%, #07070c 100%)`,
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: slotWidth,
                    height: slotHeight,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div
                      style={{
                        display: "flex",
                        width: 52,
                        height: 52,
                        borderRadius: 999,
                        overflow: "hidden",
                        backgroundColor: "#000000",
                        border: `1px solid ${member.accent}88`,
                      }}
                    >
                      {member.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.icon} width={52} height={52} style={{ objectFit: "cover" }} />
                      ) : null}
                    </div>
                    <Stars count={member.rarity} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 23, fontWeight: 700, lineHeight: 1.1 }}>
                      {safeName(member.name, "—")}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", marginTop: 5, fontSize: 12.5 }}>
                      <div style={{ display: "flex", color: "#b7b3c9" }}>{`Lv. ${member.level}`}</div>
                      <div style={{ display: "flex", color: member.elementColor, marginLeft: 8 }}>
                        {member.element}
                      </div>
                      <div style={{ display: "flex", color: "#6f6f86", marginLeft: 8 }}>
                        {member.kind === "zzz" ? member.profession : member.pathName}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
                      {keyStats(member).map((row, rowIndex) => (
                        <div
                          key={row.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            ...(rowIndex
                              ? {
                                  borderTop: "1px solid rgba(255,255,255,0.08)",
                                  paddingTop: 6,
                                  marginTop: 6,
                                }
                              : {}),
                          }}
                        >
                          <div style={{ display: "flex", fontSize: 10.5, letterSpacing: 1.2, color: "#8f8fa6" }}>
                            {row.label.toUpperCase()}
                          </div>
                          <div style={{ display: "flex", fontSize: 14, fontWeight: 600 }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexGrow: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: 12,
            fontSize: 11.5,
            letterSpacing: 2,
            color: "#6f6f86",
          }}
        >
          <div style={{ display: "flex" }}>TEAM BUILD · ASTRA</div>
          <div style={{ display: "flex", fontSize: 9, letterSpacing: 1.4, color: "#4a4a5c" }}>
            Fan-made · not affiliated with HoYoverse
          </div>
          <div style={{ display: "flex" }}>
            {`${members.length}/${size} SLOTS · ${
              profile.player.uid === "manual" ? "MANUAL BUILD" : `UID ${profile.player.uid}`
            }`}
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
