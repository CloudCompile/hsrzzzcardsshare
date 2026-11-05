import { ImageResponse } from "next/og";
import { GAMES } from "@/lib/site";
import { fmtInt } from "@/lib/format";
import type { Character, Game, GearPiece, SetGroup, ShowcaseProfile, StatRow, WeaponInfo } from "@/lib/types";

const BG = "#07070c";
const PANEL = "rgba(255,255,255,0.04)";
const LINE = "1px solid rgba(255,255,255,0.075)";

function safeName(value: string, fallback: string): string {
  const cleaned = value.replace(/[^\x20-\x7E]/g, "").trim();
  return cleaned.length ? cleaned : fallback;
}

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: "flex" }}>
      {Array.from({ length: Math.max(0, Math.min(5, count)) }).map((_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            width: 10,
            height: 10,
            marginRight: 5,
            borderRadius: 2,
            backgroundColor: "#ffd977",
            transform: "rotate(45deg)",
          }}
        />
      ))}
    </div>
  );
}

function StatLine({ row, compact = false }: { row: StatRow; compact?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: compact ? "5px 10px" : "8px 12px",
        marginBottom: compact ? 5 : 6,
        borderRadius: 8,
        background: PANEL,
        border: LINE,
      }}
    >
      <div style={{ display: "flex", fontSize: compact ? 13.5 : 15, color: "#9a97ad", letterSpacing: 1 }}>
        {row.label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div
          style={{ display: "flex", fontSize: compact ? 19 : 22, fontWeight: 600, color: "#ffffff" }}
        >
          {row.value}
        </div>
        {row.detail ? (
          <div style={{ display: "flex", fontSize: compact ? 10.5 : 12, color: "#6f6f86", marginTop: 1 }}>
            {row.detail}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RelicTile({ piece, width }: { piece: GearPiece; width: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width,
        padding: 9,
        marginBottom: 7,
        borderRadius: 10,
        background: PANEL,
        border: LINE,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 62, marginRight: 10 }}>
        <div
          style={{
            display: "flex",
            width: 48,
            height: 48,
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: "#000000",
            border: "1px solid rgba(255,255,255,0.11)",
          }}
        >
          {piece.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={piece.icon} width={48} height={48} style={{ objectFit: "cover" }} />
          ) : null}
        </div>
        <div style={{ display: "flex", marginTop: 3, fontSize: 11, color: "#8f8fa6" }}>{`+${piece.level}`}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", width: width - 90 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: width - 90,
          }}
        >
          <div style={{ display: "flex", fontSize: 10.5, letterSpacing: 1.2, color: "#6f6f86" }}>
            {piece.slot.toUpperCase()}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 12, color: "#8f8fa6", marginRight: 7 }}>{piece.main.label}</div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: "#ffffff" }}>{piece.main.value}</div>
          </div>
        </div>

        {piece.subs.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 4 }}>
            {piece.subs.slice(0, 4).map((sub, index) => (
              <div
                key={`${sub.label}-${index}`}
                style={{ display: "flex", alignItems: "center", width: "50%", fontSize: 12.5, marginBottom: 1 }}
              >
                <div style={{ display: "flex", color: "#7a7a92", marginRight: 6 }}>{sub.label}</div>
                <div style={{ display: "flex", color: "#dfdbea" }}>{sub.value}</div>
                {sub.rolls && sub.rolls > 1 ? (
                  <div style={{ display: "flex", marginLeft: 5, fontSize: 9.5, color: "#5d5d72" }}>{`×${sub.rolls}`}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 4, fontSize: 11.5, color: "#5d5d72" }}>No sub stats</div>
        )}
      </div>
    </div>
  );
}

function SetChips({ sets, width }: { sets: SetGroup[]; width: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width }}>
      {sets.map((set) => (
        <div
          key={set.id}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 10px",
            marginRight: 7,
            marginBottom: 6,
            borderRadius: 8,
            background: "rgba(255,255,255,0.035)",
            border: LINE,
          }}
        >
          {set.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={set.icon} width={19} height={19} style={{ objectFit: "contain", marginRight: 7 }} />
          ) : null}
          <div style={{ display: "flex", fontSize: 11.5, color: "#6f6f86", marginRight: 6 }}>{`${set.pieces}pc`}</div>
          <div style={{ display: "flex", fontSize: 12.5, color: "#cfcbdd" }}>{safeName(set.name, "Set")}</div>
        </div>
      ))}
    </div>
  );
}

const CORE_LETTERS = ["—", "A", "B", "C", "D", "E", "F"];

function CoreRanks({ rank, accent }: { rank: number; accent: string }) {
  const level = Math.max(0, Math.min(6, rank));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        marginTop: 12,
        padding: "10px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: LINE,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 11, letterSpacing: 3, color: "#6f6f86", marginRight: 14 }}>
          CORE SKILL
        </div>
        <div style={{ display: "flex" }}>
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              style={{
                display: "flex",
                width: 24,
                height: 6,
                borderRadius: 3,
                marginRight: 5,
                backgroundColor: step <= level ? accent : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            fontSize: 15,
            fontWeight: 700,
            color: level ? "#ffffff" : "#5d5d72",
          }}
        >
          {CORE_LETTERS[level]}
        </div>
        <div style={{ display: "flex", fontSize: 10.5, letterSpacing: 1.5, color: "#5d5d72", marginLeft: 7 }}>
          RANK
        </div>
      </div>
    </div>
  );
}

function WeaponPanel({ weapon, kind }: { weapon: WeaponInfo; kind: Game }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginTop: 14,
        padding: 9,
        borderRadius: 11,
        background: "rgba(10,10,18,0.78)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 52,
          height: 52,
          borderRadius: 9,
          overflow: "hidden",
          backgroundColor: "#000000",
          marginRight: 11,
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        {weapon.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={weapon.icon} width={52} height={52} style={{ objectFit: "cover" }} />
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <div style={{ display: "flex", fontSize: 16, fontWeight: 600 }}>
          {safeName(weapon.name, kind === "zzz" ? "W-Engine" : "Light Cone")}
        </div>
        <div style={{ display: "flex", fontSize: 11.5, color: "#8f8fa6", marginTop: 3 }}>
          {`${kind === "zzz" ? "W-Engine" : "Light cone"} · ${
            kind === "zzz" ? `Effect ${weapon.effect}` : `S${weapon.effect}`
          } · Lv. ${weapon.level}`}
        </div>
        {weapon.base ? (
          <div style={{ display: "flex", marginTop: 4, fontSize: 11.5, color: "#cfcbdd" }}>
            <div style={{ display: "flex", marginRight: 10 }}>{`HP ${fmtInt(weapon.base.hp)}`}</div>
            <div style={{ display: "flex", marginRight: 10 }}>{`ATK ${fmtInt(weapon.base.atk)}`}</div>
            <div style={{ display: "flex" }}>{`DEF ${fmtInt(weapon.base.def)}`}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Full character sheet card: splash art and identity on the left, the panel with
 * base + added stat breakdown in the middle, relics with every sub stat on the right.
 */
export function detailCard({
  character,
  profile,
  game,
}: {
  character: Character;
  profile: ShowcaseProfile;
  game: Game;
}): ImageResponse {
  const width = 1600;
  const height = 900;
  const accent = character.accent;
  const isZzz = character.kind === "zzz";
  const artWidth = 440;
  // ZZZ's panel is two columns in game; the HSR sheet reads as one.
  const stats = character.sheet.slice(0, 11);
  const statColumns = isZzz ? [stats.slice(0, 6), stats.slice(6, 11)] : [stats];
  const statWidth = isZzz ? 660 : 430;
  const gear = character.gear.slice(0, 6);
  const sets = character.sets.slice(0, 4);
  const gearWidth = width - artWidth - statWidth - 60;
  const weapon = character.weapon;

  const identity =
    character.kind === "zzz"
      ? `${character.profession} · Core ${character.coreRank}`
      : `${character.pathName} · E${character.eidolon}`;
  const maxLevel = character.kind === "zzz" ? 60 : 80;
  const gearLabel = character.kind === "zzz" ? "DRIVE DISCS" : "RELICS";

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          backgroundColor: BG,
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Splash art */}
        <div
          style={{
            display: "flex",
            width: artWidth,
            height: "100%",
            position: "relative",
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {character.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.portrait}
              width={artWidth}
              height={900}
              style={{
                objectFit: isZzz ? "contain" : "cover",
                objectPosition: isZzz ? "bottom center" : "center top",
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: artWidth,
              height: 900,
              display: "flex",
              background: `linear-gradient(140deg, ${accent}30 0%, transparent 52%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: artWidth,
              height: 900,
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(7,7,12,0.6) 0%, rgba(7,7,12,0.1) 32%, rgba(7,7,12,0.9) 76%, #07070c 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: artWidth,
              height: 900,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 32,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{ display: "flex", width: 10, height: 10, borderRadius: 3, backgroundColor: accent, marginRight: 10 }}
              />
              <div style={{ display: "flex", fontSize: 18, letterSpacing: 6, fontWeight: 700 }}>ASTRA</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <Stars count={character.rarity} />
              <div style={{ display: "flex", fontSize: 46, fontWeight: 700, marginTop: 9, lineHeight: 1.05 }}>
                {safeName(character.name, "Character")}
              </div>
              <div style={{ display: "flex", alignItems: "center", marginTop: 9, fontSize: 15.5 }}>
                <div style={{ display: "flex", color: "#ffffff" }}>{`Lv. ${character.level}/${maxLevel}`}</div>
                <div style={{ display: "flex", color: accent, marginLeft: 12 }}>{character.element}</div>
                <div style={{ display: "flex", color: "#8f8fa6", marginLeft: 10 }}>{identity}</div>
              </div>
              {weapon && !isZzz ? <WeaponPanel weapon={weapon} kind={character.kind} /> : null}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: statWidth,
            height: "100%",
            padding: "30px 20px",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 12, letterSpacing: 3, color: "#6f6f86" }}>PANEL STATS</div>
            <div style={{ display: "flex", fontSize: 11, color: "#5d5d72" }}>{GAMES[game].short}</div>
          </div>

          <div style={{ display: "flex", marginTop: 12 }}>
            {statColumns.map((column, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                  marginRight: index === statColumns.length - 1 ? 0 : 10,
                }}
              >
                {column.map((row) => (
                  <StatLine key={row.label} row={row} />
                ))}
              </div>
            ))}
          </div>

          {isZzz ? <CoreRanks rank={character.core} accent={accent} /> : null}
          {isZzz && weapon ? <WeaponPanel weapon={weapon} kind={character.kind} /> : null}

          <div style={{ display: "flex", flexGrow: 1 }} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.07)",
              fontSize: 10.5,
              lineHeight: 1.5,
              color: "#5d5d72",
            }}
          >
            <div style={{ display: "flex" }}>
              {character.kind === "zzz"
                ? "Level, promotion, core skill, discs and 2pc sets. W-Engine passives excluded."
                : "Level, light cone, traces, relics and set bonuses."}
            </div>
          </div>
        </div>

        {/* Gear */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, height: "100%", padding: "30px 30px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: gearWidth,
            }}
          >
            <div style={{ display: "flex", fontSize: 12, letterSpacing: 3, color: "#6f6f86" }}>{gearLabel}</div>
            <div style={{ display: "flex", fontSize: 11, color: "#5d5d72" }}>{`${gear.length}/6 equipped`}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
            {gear.length ? (
              gear.map((piece) => <RelicTile key={piece.slot} piece={piece} width={gearWidth} />)
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: gearWidth,
                  height: 220,
                  borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,0.14)",
                  fontSize: 13,
                  color: "#565669",
                }}
              >
                No {character.kind === "zzz" ? "discs" : "relics"} equipped
              </div>
            )}
          </div>

          {sets.length ? <SetChips sets={sets} width={gearWidth} /> : null}

          <div style={{ display: "flex", flexGrow: 1 }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: gearWidth,
              borderTop: "1px solid rgba(255,255,255,0.07)",
              marginTop: 8,
              paddingTop: 10,
              fontSize: 12.5,
              color: "#6f6f86",
            }}
          >
            <div style={{ display: "flex" }}>{safeName(profile.player.nickname, "Showcase")}</div>
            <div style={{ display: "flex" }}>
              {`${profile.player.uid === "manual" ? "MANUAL BUILD" : `UID ${profile.player.uid}`} · ${
                GAMES[game].short
              }`}
            </div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}

/**
 * Portrait cut of the same sheet: art banner on top, panel in two columns,
 * gear as a 2 x 3 grid. For feeds and stories that want a vertical card.
 */
export function portraitCard({
  character,
  profile,
  game,
}: {
  character: Character;
  profile: ShowcaseProfile;
  game: Game;
}): ImageResponse {
  const width = 1080;
  const height = 1350;
  const pad = 32;
  const contentWidth = width - pad * 2;
  const gap = 12;
  const tileWidth = Math.floor((contentWidth - gap) / 2);
  const columnWidth = Math.floor((contentWidth - 10) / 2);
  const accent = character.accent;
  const isZzz = character.kind === "zzz";
  // ZZZ roster art is a 1484 x 2048 standing pose, so it gets a full-height
  // splash column rather than a wide crop that would land on the character's legs.
  const bannerHeight = isZzz ? 420 : 372;
  // The splash column is deliberately taller than the banner and clipped at the
  // knee, so the standing pose reads at a usable size.
  const zzzArtWidth = 372;
  const zzzArtHeight = Math.round((zzzArtWidth * 2048) / 1484);
  const stats = character.sheet.slice(0, 11);
  const statColumns = [stats.slice(0, 6), stats.slice(6)];
  const gear = character.gear.slice(0, 6);
  const sets = character.sets.slice(0, 4);
  const weapon = character.weapon;
  const maxLevel = isZzz ? 60 : 80;

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
        <div
          style={{ display: "flex", position: "relative", width, height: bannerHeight, overflow: "hidden" }}
        >
          {isZzz && character.portrait ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: zzzArtWidth + 200,
                height: bannerHeight,
                display: "flex",
                justifyContent: "flex-end",
                background: `linear-gradient(200deg, ${accent}33 0%, transparent 58%)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: zzzArtWidth,
                  height: bannerHeight,
                  overflow: "hidden",
                  paddingTop: 26,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={character.portrait}
                  width={zzzArtWidth}
                  height={zzzArtHeight}
                  style={{ objectFit: "cover" }}
                />
              </div>
            </div>
          ) : !isZzz && character.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.portrait}
              width={width}
              height={bannerHeight}
              style={{ objectFit: "cover" }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height: bannerHeight,
              display: "flex",
              background: `linear-gradient(140deg, ${accent}30 0%, transparent 55%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width,
              height: bannerHeight,
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(7,7,12,0.55) 0%, rgba(7,7,12,0.05) 30%, rgba(7,7,12,0.72) 72%, rgba(7,7,12,0.98) 100%)",
            }}
          />
          {isZzz ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width,
                height: bannerHeight,
                display: "flex",
                background: `linear-gradient(to right, ${BG} 0%, rgba(7,7,12,0.88) 30%, rgba(7,7,12,0) 66%)`,
              }}
            />
          ) : null}

          <div style={{ position: "absolute", top: 24, left: pad, display: "flex", alignItems: "center" }}>
            <div
              style={{ display: "flex", width: 10, height: 10, borderRadius: 3, backgroundColor: accent, marginRight: 10 }}
            />
            <div style={{ display: "flex", fontSize: 17, letterSpacing: 6, fontWeight: 700 }}>ASTRA</div>
          </div>
          <div
            style={{
              position: "absolute",
              top: 20,
              right: pad,
              display: "flex",
              fontSize: 11,
              letterSpacing: 2,
              color: "#c9c9d8",
              padding: "5px 9px",
              borderRadius: 6,
              backgroundColor: "rgba(7,7,12,0.62)",
            }}
          >
            {`${GAMES[game].short} · ${
              profile.player.uid === "manual" ? "MANUAL BUILD" : `UID ${profile.player.uid}`
            }`}
          </div>

          <div
            style={{ position: "absolute", bottom: 20, left: pad, display: "flex", flexDirection: "column" }}
          >
            <Stars count={character.rarity} />
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700, marginTop: 8, lineHeight: 1.05 }}>
              {safeName(character.name, "Character")}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 8, fontSize: 15.5 }}>
              <div style={{ display: "flex", color: "#ffffff" }}>{`Lv. ${character.level}/${maxLevel}`}</div>
              <div style={{ display: "flex", color: accent, marginLeft: 12 }}>{character.element}</div>
              <div style={{ display: "flex", color: "#8f8fa6", marginLeft: 10 }}>
                {character.kind === "zzz"
                  ? `${character.profession} · Core ${character.coreRank}`
                  : `${character.pathName} · E${character.eidolon}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: pad, paddingTop: 16 }}>
          {weapon ? <WeaponPanel weapon={weapon} kind={character.kind} /> : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: contentWidth,
              marginTop: 14,
            }}
          >
            <div style={{ display: "flex", fontSize: 12, letterSpacing: 3, color: "#6f6f86" }}>PANEL STATS</div>
            <div style={{ display: "flex", fontSize: 11, color: "#5d5d72" }}>{GAMES[game].short}</div>
          </div>

          <div style={{ display: "flex", marginTop: 8 }}>
            {statColumns.map((column, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: columnWidth,
                  marginRight: index === statColumns.length - 1 ? 0 : 10,
                }}
              >
                {column.map((row) => (
                  <StatLine key={row.label} row={row} compact />
                ))}
              </div>
            ))}
          </div>

          {isZzz ? <CoreRanks rank={character.core} accent={accent} /> : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: contentWidth,
              marginTop: 14,
            }}
          >
            <div style={{ display: "flex", fontSize: 12, letterSpacing: 3, color: "#6f6f86" }}>
              {character.kind === "zzz" ? "DRIVE DISCS" : "RELICS"}
            </div>
            <div style={{ display: "flex", fontSize: 11, color: "#5d5d72" }}>{`${gear.length}/6 equipped`}</div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", width: contentWidth, marginTop: 8 }}>
            {gear.map((piece, index) => (
              <div
                key={piece.slot}
                style={{ display: "flex", width: tileWidth, marginRight: index % 2 === 0 ? gap : 0 }}
              >
                <RelicTile piece={piece} width={tileWidth} />
              </div>
            ))}
          </div>

          {sets.length ? <SetChips sets={sets} width={contentWidth} /> : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: contentWidth,
              borderTop: "1px solid rgba(255,255,255,0.07)",
              marginTop: 6,
              paddingTop: 10,
              fontSize: 12.5,
              color: "#6f6f86",
            }}
          >
            <div style={{ display: "flex" }}>{safeName(profile.player.nickname, "Showcase")}</div>
            <div style={{ display: "flex" }}>{`${GAMES[game].short} sheet · astra`}</div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
