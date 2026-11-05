import { Stars } from "./ui";
import { GAMES, TEAM_SIZE } from "@/lib/site";
import type { Character, Game } from "@/lib/types";

function statsFor(character: Character) {
  const wanted =
    character.kind === "zzz"
      ? ["ATK", "CRIT Rate", "CRIT DMG"]
      : ["SPD", "CRIT Rate", "CRIT DMG"];
  const rows = wanted
    .map((label) => character.sheet.find((row) => row.label === label))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .slice(0, 2);
  return rows;
}

export function TeamCard({
  game,
  uid,
  title,
  members,
}: {
  game: Game;
  uid: string;
  title: string;
  members: Character[];
}) {
  const size = TEAM_SIZE[game];
  const slots = Array.from({ length: size }, (_, index) => members[index] ?? null);
  const accent = GAMES[game].accent;

  return (
    <article
      className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#08080f]"
      style={{ boxShadow: `0 40px 120px -60px ${accent}` }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(90% 120% at 0% 0%, ${accent}22, transparent 55%), radial-gradient(80% 100% at 100% 100%, #a98bff22, transparent 60%)`,
          }}
        />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
        <div className="min-w-0">
          <p className="label" style={{ color: `${accent}` }}>
            {GAMES[game].short} team build
          </p>
          <h3 className="mt-0.5 truncate font-display text-lg font-semibold leading-tight text-white">
            {title || "Untitled team"}
          </h3>
        </div>
        <div className="num shrink-0 text-right text-[10px] leading-tight text-faint">
          <p className="text-white/60">ASTRA</p>
          <p>{uid}</p>
        </div>
      </div>

      <div
        className="relative grid gap-2 p-3"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {slots.map((member, index) =>
          member ? (
            <div
              key={member.id}
              className="relative overflow-hidden rounded-[24px] border border-white/[0.05]"
              style={{ background: `linear-gradient(180deg, ${member.accent}1f, rgba(255,255,255,0.012))` }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(100% 70% at 50% 0%, ${member.accent}33, transparent 70%)`,
                }}
              />
              {member.portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={member.portrait}
                  alt=""
                  className="absolute -bottom-2 left-1/2 h-[135%] w-auto max-w-none -translate-x-1/2 opacity-25"
                  style={{
                    maskImage: "linear-gradient(180deg, #000 40%, transparent 92%)",
                    WebkitMaskImage: "linear-gradient(180deg, #000 40%, transparent 92%)",
                  }}
                />
              ) : null}

              <div className="relative p-2.5">
                <div className="flex items-start justify-between gap-1">
                  <div
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-black/60"
                    style={{ borderColor: `${member.accent}66` }}
                  >
                    {member.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.icon} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <Stars count={member.rarity} className="text-[#ffd977]" />
                </div>
                <p className="mt-2 truncate font-display text-[13px] font-semibold text-white">
                  {member.name}
                </p>
                <p className="num mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                  <span>Lv.{member.level}</span>
                  <span className="text-white/15">/</span>
                  <span style={{ color: member.elementColor }}>{member.element}</span>
                </p>
                <div className="mt-2 space-y-1">
                  {statsFor(member).map((row) => (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between gap-1 border-t border-white/[0.07] pt-1 first:border-t-0 first:pt-0"
                    >
                      <span className="truncate text-[9px] uppercase tracking-wide text-faint">
                        {row.label}
                      </span>
                      <span className="num shrink-0 text-[10.5px] text-white/85">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              key={`empty-${index}`}
              className="relative flex min-h-[148px] flex-col items-center justify-center gap-1 rounded-[24px] border border-dashed border-white/[0.12] bg-white/[0.015]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-lg text-white/25">
                +
              </span>
              <span className="text-[9.5px] uppercase tracking-[0.16em] text-white/25">Empty</span>
            </div>
          ),
        )}
      </div>

      <div className="relative flex items-center justify-between border-t border-white/[0.07] px-4 py-2 text-[9.5px] uppercase tracking-[0.16em] text-faint">
        <span>astra · {GAMES[game].label}</span>
        <span className="num">{members.length}/{size} slots</span>
      </div>
    </article>
  );
}
