import { ImageResponse } from "next/og";
import { GAMES } from "@/lib/site";
import { fmtInt } from "@/lib/format";
import type { Character, Game, GearPiece, SetGroup, ShowcaseProfile, StatRow, WeaponInfo } from "@/lib/types";

const BG = "#07070c";
const GLASS = "rgba(8,8,15,0.56)";
const LINE = "1px solid rgba(255,255,255,0.085)";

function safeName(value: string, fallback: string): string {
  const cleaned = value.replace(/[^\x20-\x7E]/g, "").trim();
  return cleaned.length ? cleaned : fallback;
}

/**
 * Full-bleed character art behind the card. The roster art is a standing pose, so
 * `focus` picks which horizontal band of it the crop keeps — 0 is the head, 1 the
 * feet. Transparent artwork means it sits directly on the card background.
 */
export function SplashArt({
  character,
  width,
  height,
  focus = 0.02,
  opacity = 1,
}: {
  character: Character;
  width: number;
  height: number;
  focus?: number;
  opacity?: number;
}) {
  const accent = character.accent;
  // Satori drops object-position percentages, so the crop is done by hand: scale
  // the art to cover the card and shift it so `focus` picks the visible band.
  const aspect = character.kind === "zzz" ? 1132 / 2120 : 1;
  const artHeight = Math.max(height, width / aspect);
  const artWidth = artHeight * aspect;
  const top = -Math.max(0, artHeight - height) * focus;
  const left = -(artWidth - width) / 2;
  return (
    <>
      {character.portrait ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={character.portrait}
          width={Math.round(artWidth)}
          height={Math.round(artHeight)}
          style={{
            position: "absolute",
            top: Math.round(top),
            left: Math.round(left),
            width: Math.round(artWidth),
            height: Math.round(artHeight),
            opacity,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          background: `linear-gradient(152deg, ${accent}3d 0%, ${accent}14 30%, rgba(7,7,12,0) 62%)`,
        }}
      />
    </>
  );
}

/** Hairline frame plus two accent ticks, so the card reads as a card and not a crop. */
export function CardFrame({ width, height, accent }: { width: number; height: number; accent: string }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          width: width - 28,
          height: height - 28,
          display: "flex",
          border: "1px solid rgba(255,255,255,0.11)",
          borderRadius: 18,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 13,
          left: 44,
          width: 96,
          height: 3,
          display: "flex",
          background: accent,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 13,
          right: 44,
          width: 96,
          height: 3,
          display: "flex",
          background: accent,
          opacity: 0.45,
          borderRadius: 2,
        }}
      />
    </>
  );
}

function Brand({ accent, right }: { accent: string; right: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
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
        {right}
      </div>
    </div>
  );
}

function Eyebrow({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", width: 16, height: 2, backgroundColor: accent, marginRight: 8, borderRadius: 1 }} />
      <div style={{ display: "flex", fontSize: 10.5, letterSpacing: 3, color: "#a8a4bb" }}>{label}</div>
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {Array.from({ length: Math.max(0, Math.min(5, count)) }).map((_, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            width: 9,
            height: 9,
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

function Chip({ label, accent, filled }: { label: string; accent: string; filled?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 9px",
        marginRight: 6,
        borderRadius: 6,
        fontSize: 11.5,
        letterSpacing: 1,
        color: filled ? "#0a0a12" : "#e6e3f1",
        backgroundColor: filled ? accent : "rgba(255,255,255,0.06)",
        border: `1px solid ${filled ? accent : "rgba(255,255,255,0.09)"}`,
      }}
    >
      {label}
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
        marginBottom: compact ? 5 : 8,
        // Fixed height and no shrinking: a card with six discs has more content than
        // one with three, and letting the flex box squeeze these rows made them
        // overlap their own detail line instead of pushing the block up.
        flexShrink: 0,
        height: compact ? 46 : 62,
        borderRadius: 8,
        background: GLASS,
        border: LINE,
      }}
    >
      <div style={{ display: "flex", fontSize: compact ? 12 : 14, color: "#9b97b0", letterSpacing: 1 }}>
        {row.label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ display: "flex", fontSize: compact ? 18 : 21, fontWeight: 600, color: "#ffffff" }}>{row.value}</div>
        {row.detail ? (
          <div style={{ display: "flex", fontSize: compact ? 10 : 11, color: "#7c7893", marginTop: 1 }}>{row.detail}</div>
        ) : null}
      </div>
    </div>
  );
}

function RelicTile({ piece, width, compact = false }: { piece: GearPiece; width: number; compact?: boolean }) {
  const pad = compact ? 7 : 8;
  const icon = compact ? 38 : 46;
  const contentWidth = width - pad * 2 - icon - 10;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width,
        padding: pad,
        marginBottom: compact ? 6 : 7,
        borderRadius: 10,
        background: GLASS,
        border: LINE,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: icon,
          height: icon,
          borderRadius: 7,
          overflow: "hidden",
          backgroundColor: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(255,255,255,0.12)",
          marginRight: 10,
        }}
      >
        {piece.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={piece.icon} width={icon} height={icon} style={{ objectFit: "cover" }} />
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", width: contentWidth }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: contentWidth }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 9.5, letterSpacing: 1.2, color: "#7c7893", marginRight: 8 }}>
              {piece.slot.toUpperCase()}
            </div>
            <div style={{ display: "flex", fontSize: 9.5, color: "#5f5b74" }}>{`+${piece.level}`}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 11, color: "#9b97b0", marginRight: 7 }}>{piece.main.label}</div>
            <div style={{ display: "flex", fontSize: 13.5, fontWeight: 600, color: "#ffffff" }}>{piece.main.value}</div>
          </div>
        </div>

        {piece.subs.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 3 }}>
            {piece.subs.slice(0, 4).map((sub, index) => (
              <div
                key={`${sub.label}-${index}`}
                style={{ display: "flex", alignItems: "center", width: "50%", fontSize: 10.5, marginBottom: 1 }}
              >
                <div style={{ display: "flex", color: "#7c7893", marginRight: 5 }}>{sub.label}</div>
                <div style={{ display: "flex", color: "#e0dcec" }}>{sub.value}</div>
                {sub.rolls && sub.rolls > 1 ? (
                  <div style={{ display: "flex", marginLeft: 4, fontSize: 9, color: "#615d76" }}>{`×${sub.rolls}`}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 3, fontSize: 10, color: "#5f5b74" }}>No sub stats</div>
        )}
      </div>
    </div>
  );
}

function SetChips({ sets, accent }: { sets: SetGroup[]; accent: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {sets.map((set) => (
        <div
          key={set.id}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "5px 9px",
            marginRight: 6,
            marginBottom: 5,
            borderRadius: 7,
            background: "rgba(8,8,15,0.6)",
            border: LINE,
          }}
        >
          {set.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={set.icon} width={17} height={17} style={{ objectFit: "contain", marginRight: 6 }} />
          ) : null}
          <div style={{ display: "flex", fontSize: 10, color: accent, marginRight: 5, letterSpacing: 1 }}>{`${set.pieces}PC`}</div>
          <div style={{ display: "flex", fontSize: 11.5, color: "#dcd9e8" }}>{safeName(set.name, "Set")}</div>
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
        marginTop: 10,
        padding: "9px 12px",
        borderRadius: 9,
        background: GLASS,
        border: LINE,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 10, letterSpacing: 2.5, color: "#7c7893", marginRight: 12 }}>CORE</div>
        <div style={{ display: "flex" }}>
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              style={{
                display: "flex",
                width: 22,
                height: 5,
                borderRadius: 3,
                marginRight: 4,
                backgroundColor: step <= level ? accent : "rgba(255,255,255,0.13)",
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 14, fontWeight: 700, color: level ? "#ffffff" : "#5f5b74" }}>
          {CORE_LETTERS[level]}
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
        marginTop: 10,
        padding: 8,
        borderRadius: 10,
        background: GLASS,
        border: LINE,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 46,
          height: 46,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "rgba(0,0,0,0.5)",
          marginRight: 10,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {weapon.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={weapon.icon} width={46} height={46} style={{ objectFit: "cover" }} />
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <div style={{ display: "flex", fontSize: 14.5, fontWeight: 600 }}>
          {safeName(weapon.name, kind === "zzz" ? "W-Engine" : "Light Cone")}
        </div>
        <div style={{ display: "flex", fontSize: 10.5, color: "#9b97b0", marginTop: 2 }}>
          {`${kind === "zzz" ? "W-Engine" : "Light cone"} · ${
            kind === "zzz" ? `W${weapon.modification ?? 1}` : `S${weapon.effect}`
          } · Lv. ${weapon.level}`}
        </div>
        {weapon.stats?.length ? (
          <div style={{ display: "flex", marginTop: 3, fontSize: 10.5, color: "#d7d3e4", flexWrap: "wrap" }}>
            {weapon.stats.map((stat) => (
              <div key={stat.label} style={{ display: "flex", marginRight: 10 }}>
                {`${stat.label} ${stat.value}`}
              </div>
            ))}
          </div>
        ) : weapon.base ? (
          <div style={{ display: "flex", marginTop: 3, fontSize: 10.5, color: "#d7d3e4" }}>
            <div style={{ display: "flex", marginRight: 10 }}>{`HP ${fmtInt(weapon.base.hp)}`}</div>
            <div style={{ display: "flex", marginRight: 10 }}>{`ATK ${fmtInt(weapon.base.atk)}`}</div>
            <div style={{ display: "flex" }}>{`DEF ${fmtInt(weapon.base.def)}`}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function identityLine(character: Character): string {
  return character.kind === "zzz"
    ? `${character.profession} · Core ${character.coreRank}`
    : `${character.pathName}`;
}

function rankLine(character: Character): string {
  return character.kind === "zzz" ? `M${character.mindscape}` : `E${character.eidolon}`;
}

/**
 * Full character sheet card. The splash art runs across the whole card; the panel
 * and gear sit on it as glass, so the art still reads through the numbers.
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
  const pad = 44;
  const leftWidth = 500;
  const rightWidth = width - leftWidth;
  const rightInner = rightWidth - pad - 24;
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
          backgroundColor: BG,
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <SplashArt character={character} width={width} height={height} focus={isZzz ? 0.06 : 0} />

        {/* Scrims: readable text on the left, readable panels on the right, art between. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(7,7,12,0.97) 0%, rgba(7,7,12,0.9) 22%, rgba(7,7,12,0.52) 42%, rgba(7,7,12,0.1) 58%, rgba(7,7,12,0.55) 78%, rgba(7,7,12,0.93) 100%)",
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
              "linear-gradient(180deg, rgba(7,7,12,0.82) 0%, rgba(7,7,12,0.2) 12%, rgba(7,7,12,0) 26%, rgba(7,7,12,0) 62%, rgba(7,7,12,0.86) 88%, #07070c 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -260,
            left: 60,
            width: 900,
            height: 560,
            borderRadius: 999,
            display: "flex",
            background: `linear-gradient(120deg, ${accent}3d, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 999,
            display: "flex",
            background: `linear-gradient(220deg, ${accent}22, transparent 66%)`,
          }}
        />
        <CardFrame width={width} height={height} accent={accent} />

        {/* Identity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: leftWidth,
            height,
            padding: `${pad}px 6px ${pad}px ${pad}px`,
          }}
        >
          <Brand accent={accent} right={`${GAMES[game].short} · ${profile.player.uid === "manual" ? "MANUAL" : `UID ${profile.player.uid}`}`} />
          <div style={{ display: "flex", flexGrow: 1 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Stars count={character.rarity} />
            <div style={{ display: "flex", fontSize: 58, fontWeight: 700, marginTop: 8, lineHeight: 1, letterSpacing: -1 }}>
              {safeName(character.name, "Character")}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
              <div style={{ display: "flex", fontSize: 14, color: "#ffffff", marginRight: 10 }}>{`Lv. ${character.level}/${maxLevel}`}</div>
              <Chip label={character.element} accent={accent} filled />
              <Chip label={rankLine(character)} accent={accent} />
            </div>
            <div style={{ display: "flex", fontSize: 12, color: "#a8a4bb", marginTop: 9, letterSpacing: 1 }}>
              {identityLine(character)}
            </div>
            {weapon ? <WeaponPanel weapon={weapon} kind={character.kind} /> : null}
            {isZzz ? <CoreRanks rank={character.core} accent={accent} /> : null}
            {sets.length ? <div style={{ display: "flex", marginTop: 10 }}><SetChips sets={sets} accent={accent} /></div> : null}
          </div>
        </div>

        {/* Panel + gear */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: rightWidth,
            padding: `${pad}px ${pad}px ${pad}px 24px`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: rightInner }}>
            <Eyebrow label="PANEL STATS" accent={accent} />
            <div style={{ display: "flex", fontSize: 10.5, letterSpacing: 2, color: "#7c7893" }}>{GAMES[game].label}</div>
          </div>

          <div style={{ display: "flex", marginTop: 10, width: rightInner }}>
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
                  <StatLine key={row.label} row={row} compact />
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: rightInner, marginTop: 16 }}>
            <Eyebrow label={isZzz ? "DRIVE DISCS" : "RELICS"} accent={accent} />
            <div style={{ display: "flex", fontSize: 10.5, color: "#7c7893" }}>{`${gear.length}/6 equipped`}</div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", width: rightInner, marginTop: 8 }}>
            {gear.length ? (
              gear.map((piece) => (
                <RelicTile key={piece.slot} piece={piece} width={Math.floor(rightInner / 2) - 8} />
              ))
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: rightInner,
                  height: 150,
                  borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,0.16)",
                  fontSize: 12,
                  color: "#7c7893",
                }}
              >
                {`No ${isZzz ? "discs" : "relics"} equipped`}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexGrow: 1 }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: rightInner,
              borderTop: "1px solid rgba(255,255,255,0.09)",
              paddingTop: 9,
              fontSize: 11,
              color: "#7c7893",
            }}
          >
            <div style={{ display: "flex" }}>{safeName(profile.player.nickname, "Showcase")}</div>
            <div style={{ display: "flex" }}>
              {isZzz
                ? "Level, promotion, core, W-Engine, discs, 2pc sets"
                : "Level, light cone, traces, relics, set bonuses"}
            </div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}

/**
 * Portrait cut: the splash art fills the card and the sheet sits on it below the
 * character's head, so the whole thing reads as one image rather than a banner.
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
  const pad = 38;
  const contentWidth = width - pad * 2;
  const gap = 12;
  const tileWidth = Math.floor((contentWidth - gap) / 2);
  const columnWidth = Math.floor((contentWidth - 10) / 2);
  const accent = character.accent;
  const isZzz = character.kind === "zzz";
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
        <SplashArt character={character} width={width} height={height} focus={isZzz ? 0.02 : 0} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(7,7,12,0.62) 0%, rgba(7,7,12,0.08) 14%, rgba(7,7,12,0) 30%, rgba(7,7,12,0.62) 42%, rgba(7,7,12,0.94) 52%, #07070c 62%, #07070c 100%)",
          }}
        />
        <CardFrame width={width} height={height} accent={accent} />

        <div style={{ display: "flex", padding: pad, paddingBottom: 0 }}>
          <Brand accent={accent} right={`${GAMES[game].short} · ${profile.player.uid === "manual" ? "MANUAL" : `UID ${profile.player.uid}`}`} />
        </div>

        <div style={{ display: "flex", flexGrow: 1 }} />

        <div style={{ display: "flex", flexDirection: "column", padding: pad, paddingTop: 0, flexShrink: 0 }}>
          <Stars count={character.rarity} />
          <div style={{ display: "flex", fontSize: 66, fontWeight: 700, marginTop: 6, lineHeight: 1, letterSpacing: -1.5 }}>
            {safeName(character.name, "Character")}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
            <div style={{ display: "flex", fontSize: 13.5, marginRight: 9 }}>{`Lv. ${character.level}/${maxLevel}`}</div>
            <Chip label={character.element} accent={accent} filled />
            <Chip label={rankLine(character)} accent={accent} />
            <div style={{ display: "flex", fontSize: 11.5, color: "#a8a4bb", marginLeft: 4, letterSpacing: 1 }}>
              {identityLine(character)}
            </div>
          </div>

          {weapon ? <WeaponPanel weapon={weapon} kind={character.kind} /> : null}

          <div style={{ display: "flex", marginTop: 12 }}>
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 7 }}>
            <Eyebrow label={isZzz ? "DRIVE DISCS" : "RELICS"} accent={accent} />
            <div style={{ display: "flex", fontSize: 10.5, color: "#7c7893" }}>{`${gear.length}/6 equipped`}</div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
            {gear.map((piece) => (
              <RelicTile key={piece.slot} piece={piece} width={tileWidth} compact />
            ))}
          </div>

          {sets.length ? <div style={{ display: "flex", marginTop: 2 }}><SetChips sets={sets} accent={accent} /></div> : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.09)",
              marginTop: 8,
              paddingTop: 9,
              fontSize: 11.5,
              color: "#7c7893",
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

/**
 * Compact character card: the splash art is the card, with the panel, engine and
 * disc mains stacked over it in glass.
 */
/**
 * Compact character card: the splash art is the card, with the panel, engine and
 * disc mains stacked over it in glass. The content is pinned to the bottom rather
 * than flowing after a spacer, so a taller set of discs can never compress the
 * stat rows into each other.
 */
export function singleCard({
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
  const pad = 40;
  const gap = 12;
  const accent = character.accent;
  const isZzz = character.kind === "zzz";
  const stats = character.sheet.slice(0, 8);
  const statColumns = [stats.slice(0, 4), stats.slice(4)];
  const sets = character.sets.slice(0, 4);
  const gear = character.gear.slice(0, 6);
  const weapon = character.weapon;
  const maxLevel = isZzz ? 60 : 80;
  const contentWidth = width - pad * 2;
  const columnWidth = Math.floor((contentWidth - 10) / 2);
  const gearWidth = Math.floor((contentWidth - gap) / 2);

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
          overflow: "hidden",
        }}
      >
        <SplashArt character={character} width={width} height={height} focus={isZzz ? 0.02 : 0} />

        {/* A long dissolve: the art keeps showing behind the panel instead of ending
            in a hard band under the name. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(7,7,12,0.62) 0%, rgba(7,7,12,0.08) 14%, rgba(7,7,12,0) 32%, rgba(7,7,12,0.22) 42%, rgba(7,7,12,0.44) 52%, rgba(7,7,12,0.66) 62%, rgba(7,7,12,0.84) 72%, rgba(7,7,12,0.95) 82%, #07070c 90%, #07070c 100%)",
          }}
        />
        <CardFrame width={width} height={height} accent={accent} />

        <div style={{ position: "absolute", top: pad, left: pad, width: contentWidth, display: "flex" }}>
          <Brand accent={accent} right={`${GAMES[game].short} · ${profile.player.uid === "manual" ? "MANUAL" : `UID ${profile.player.uid}`}`} />
        </div>

        <div
          style={{
            position: "absolute",
            left: pad,
            bottom: pad,
            width: contentWidth,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stars count={character.rarity} />
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 6, lineHeight: 1, letterSpacing: -2 }}>
            {safeName(character.name, "Character")}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
            <div style={{ display: "flex", fontSize: 13.5, marginRight: 9 }}>{`Lv. ${character.level}/${maxLevel}`}</div>
            <Chip label={character.element} accent={accent} filled />
            <Chip label={rankLine(character)} accent={accent} />
            <div style={{ display: "flex", fontSize: 11.5, color: "#a8a4bb", marginLeft: 4, letterSpacing: 1 }}>
              {identityLine(character)}
            </div>
          </div>

          <div style={{ display: "flex", marginTop: 16 }}>
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
                  <StatLine key={row.label} row={row} />
                ))}
              </div>
            ))}
          </div>

          {weapon ? <WeaponPanel weapon={weapon} kind={character.kind} /> : null}

          {sets.length ? <div style={{ display: "flex", marginTop: 10 }}><SetChips sets={sets} accent={accent} /></div> : null}

          {gear.length ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
                <Eyebrow label={isZzz ? "DRIVE DISCS" : "RELICS"} accent={accent} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
                {gear.map((piece) => (
                  <div
                    key={piece.slot}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: gearWidth,
                      marginBottom: 6,
                      padding: "7px 9px",
                      borderRadius: 8,
                      background: GLASS,
                      border: LINE,
                    }}
                  >
                    <div style={{ display: "flex", fontSize: 9.5, letterSpacing: 1.2, color: "#7c7893", marginRight: 8 }}>
                      {piece.slot.toUpperCase()}
                    </div>
                    <div style={{ display: "flex", fontSize: 11, color: "#d7d3e4", marginRight: 6 }}>{piece.main.label}</div>
                    <div style={{ display: "flex", fontSize: 12, fontWeight: 600, marginLeft: "auto" }}>{piece.main.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.09)",
              marginTop: 10,
              paddingTop: 9,
              fontSize: 11.5,
              color: "#7c7893",
            }}
          >
            <div style={{ display: "flex" }}>{safeName(profile.player.nickname, "Showcase")}</div>
            <div style={{ display: "flex" }}>{`${profile.player.uid === "manual" ? "Manual card" : "Showcase card"} · ${GAMES[game].short}`}</div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
