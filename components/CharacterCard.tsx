import { Stars, StatGrid } from "./ui";
import { fmtInt } from "@/lib/format";
import type { Character } from "@/lib/types";

function subtitle(character: Character) {
  if (character.kind === "zzz") return `${character.profession} · Core ${character.coreRank}`;
  return `${character.pathName} · E${character.eidolon}`;
}

export function CharacterCard({
  character,
  onOpen,
}: {
  character: Character;
  onOpen: (character: Character) => void;
}) {
  const accent = character.accent;

  return (
    <button
      type="button"
      onClick={() => onOpen(character)}
      className="card-hover group relative w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a12] text-left"
      style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.04) inset" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 100% 0%, ${accent}2b, transparent 62%)`,
          }}
        />
        {character.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.portrait}
            alt=""
            loading="lazy"
            className="absolute -right-10 -top-6 h-[125%] w-auto max-w-none opacity-[0.22] transition-transform duration-500 group-hover:scale-[1.04] group-hover:opacity-30"
            style={{
              maskImage: "linear-gradient(90deg, transparent 8%, #000 62%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 8%, #000 62%)",
            }}
          />
        ) : null}
      </div>

      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <div
            className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/50"
            style={{ boxShadow: `0 0 26px -8px ${accent}` }}
          >
            {character.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.icon} alt={character.name} className="h-full w-full object-cover" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-[17px] font-semibold leading-tight text-white">
                {character.name}
              </h3>
              <Stars count={character.rarity} className="text-[#ffd977]" />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] leading-none text-muted">
              <span className="num text-white/80">Lv.{fmtInt(character.level)}</span>
              <span className="text-white/15">/</span>
              <span style={{ color: accent }}>{character.element}</span>
              <span className="text-white/15">/</span>
              <span className="truncate">{subtitle(character)}</span>
            </p>
          </div>

          <span className="mt-1 shrink-0 text-[10px] text-faint transition-colors group-hover:text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

        <StatGrid rows={character.sheet.slice(0, 6)} className="mt-3.5" />

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {character.sets.slice(0, 2).map((set) => (
            <span
              key={set.id}
              className="inline-flex items-center gap-1.5 rounded-sm border border-white/[0.07] bg-black/40 py-1 pl-1 pr-2 text-[10.5px] text-white/75"
              title={set.bonus.join(" · ")}
            >
              {set.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={set.icon} alt="" className="h-4 w-4 opacity-90" loading="lazy" />
              ) : null}
              <span className="num text-white/45">{set.pieces}pc</span>
              <span className="max-w-[9.5rem] truncate">{set.name}</span>
            </span>
          ))}
          {character.weapon ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-sm border border-white/[0.07] bg-black/40 py-1 pl-1 pr-2 text-[10.5px] text-white/70">
              {character.weapon.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.weapon.icon} alt="" className="h-4 w-4 opacity-90" loading="lazy" />
              ) : null}
              <span className="max-w-[10rem] truncate">{character.weapon.name}</span>
              <span className="num shrink-0 text-white/40">Lv.{character.weapon.level}</span>
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
