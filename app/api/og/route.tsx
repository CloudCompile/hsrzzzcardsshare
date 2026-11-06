import { ImageResponse } from "next/og";
import { CardBackdrop, CardFrame } from "@/lib/cards/detail";
import { GAMES, isGame } from "@/lib/site";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;
const BG = "#07070c";
const DEFAULT_ACCENT = "#7cf5d0";

/**
 * Satori renders a fixed font set, so anything outside printable ASCII risks a blank
 * glyph in the preview. Text is flattened and clipped instead of trusted.
 */
function clean(value: string | null, fallback: string, max: number): string {
  const text = (value ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const safe = text || fallback;
  return safe.length <= max ? safe : `${safe.slice(0, max - 3).trimEnd()}...`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const gameParam = url.searchParams.get("game") ?? "";
  const game = isGame(gameParam) ? gameParam : null;
  const accent = game ? GAMES[game].accent : DEFAULT_ACCENT;
  const badge = game ? `${GAMES[game].short} · showcase cards` : "ZZZ · HSR";
  const title = clean(url.searchParams.get("title"), "Your account, carded.", 64);
  const sub = clean(
    url.searchParams.get("sub"),
    "Paste a UID and get shareable character sheets, team cards and PNG exports.",
    140,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          backgroundColor: BG,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <CardBackdrop width={WIDTH} height={HEIGHT} accent={accent} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(7,7,12,0.86) 0%, rgba(7,7,12,0.30) 42%, rgba(7,7,12,0.92) 100%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", padding: 56, height: HEIGHT }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: accent,
                  marginRight: 12,
                }}
              />
              <div style={{ display: "flex", fontSize: 18, letterSpacing: 8, fontWeight: 700 }}>
                ASTRA
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                letterSpacing: 2,
                color: "#d7d5e4",
                padding: "7px 12px",
                borderRadius: 6,
                backgroundColor: "rgba(6,6,11,0.66)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {badge}
            </div>
          </div>

          <div style={{ display: "flex", flexGrow: 1 }} />

          <div
            style={{
              display: "flex",
              fontSize: title.length > 34 ? 54 : 70,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -1.6,
              maxWidth: 940,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              lineHeight: 1.35,
              color: "#a8a4bb",
              marginTop: 18,
              maxWidth: 820,
            }}
          >
            {sub}
          </div>

          <div style={{ display: "flex", flexGrow: 1 }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.12)",
              paddingTop: 16,
              fontSize: 15,
              color: "#8f8ba4",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {["Shareable cards", "PNG export", "No login"].map((item, index) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    marginRight: 18,
                    paddingLeft: index === 0 ? 0 : 0,
                    color: index === 0 ? "#cfe9e2" : "#8f8ba4",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
            <div style={{ display: "flex" }}>Fan-made · not affiliated with HoYoverse</div>
          </div>
        </div>

        {/* Frame last so its corner mark paints over the art, like the cards. */}
        <CardFrame width={WIDTH} height={HEIGHT} accent={accent} />
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
