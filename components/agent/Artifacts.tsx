"use client";

import { useState } from "react";
import type { Character, ShowcaseProfile } from "@/lib/types";

export interface ChartBar {
  label: string;
  value: number;
  target?: number;
}

export interface ChartSpec {
  title?: string;
  unit?: string;
  note?: string;
  max?: number;
  bars: ChartBar[];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Tolerant of the shapes models actually emit: bars or data, numbers or "68.4%". */
export function parseChart(raw: string): ChartSpec | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const source = data as Record<string, unknown>;
  const list = Array.isArray(source.bars)
    ? source.bars
    : Array.isArray(source.data)
      ? source.data
      : null;
  if (!list) return null;

  const bars: ChartBar[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const label = text(item.label) ?? text(item.name) ?? text(item.key);
    const value = toNumber(item.value);
    if (!label || !Number.isFinite(value)) continue;
    const target = item.target === undefined || item.target === null ? NaN : toNumber(item.target);
    bars.push({ label, value, target: Number.isFinite(target) ? target : undefined });
  }
  if (!bars.length) return null;

  const max = toNumber(source.max);
  return {
    title: text(source.title),
    unit: text(source.unit),
    note: text(source.note),
    max: Number.isFinite(max) && max > 0 ? max : undefined,
    bars,
  };
}

function withUnit(value: number, unit?: string): string {
  const rounded = Math.round(value * 10) / 10;
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  if (!unit) return body;
  return unit === "%" ? `${body}%` : `${body} ${unit}`;
}

export function ChartArtifact({ spec }: { spec: ChartSpec }) {
  const peak = Math.max(...spec.bars.map((bar) => Math.max(bar.value, bar.target ?? 0)), 1);
  const scale = spec.max ?? peak * 1.12;

  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0b13]">
      <figcaption className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <span className="font-display text-[10.5px] uppercase tracking-[0.12em] text-white/70">
          {spec.title ?? "Comparison"}
        </span>
        {spec.unit ? <span className="text-[10px] text-faint">{spec.unit}</span> : null}
      </figcaption>

      <div className="space-y-2 px-3 py-2.5">
        {spec.bars.map((bar, index) => {
          const width = Math.max(2, Math.min(100, (bar.value / scale) * 100));
          const tick =
            bar.target === undefined ? null : Math.max(0, Math.min(100, (bar.target / scale) * 100));
          const met = bar.target !== undefined && bar.value >= bar.target;

          return (
            <div key={`${bar.label}-${index}`} className="flex items-center gap-2.5">
              <span
                className="w-[88px] shrink-0 truncate text-[11px] text-muted"
                title={bar.label}
              >
                {bar.label}
              </span>
              <span className="relative h-2.5 flex-1 rounded-full bg-white/[0.06]">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${width}%`,
                    background: met
                      ? "linear-gradient(90deg, #4fdcb4, #7cf5d0)"
                      : "linear-gradient(90deg, #7c63d8, #a98bff)",
                  }}
                />
                {tick === null ? null : (
                  <span
                    className="absolute -top-1 -bottom-1 w-px bg-white/40"
                    style={{ left: `${tick}%` }}
                  />
                )}
              </span>
              <span className="num w-[74px] shrink-0 text-right text-[11px] text-white/85">
                {withUnit(bar.value, spec.unit)}
                {bar.target === undefined ? null : (
                  <span className="ml-1 text-[9.5px] text-faint">/{withUnit(bar.target, spec.unit)}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {spec.note ? (
        <p className="border-t border-white/[0.06] px-3 py-2 text-[10.5px] leading-relaxed text-faint">
          {spec.note}
        </p>
      ) : null}
    </figure>
  );
}

function findCharacter(profile: ShowcaseProfile | null, query: string): Character | undefined {
  if (!profile) return undefined;
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    profile.characters.find((character) => character.id === needle) ??
    profile.characters.find((character) => character.name.toLowerCase() === needle) ??
    profile.characters.find((character) => character.name.toLowerCase().includes(needle)) ??
    profile.characters.find((character) => needle.includes(character.name.toLowerCase()))
  );
}

/** Renders the showcase's own numbers, so the model never has to retype stats. */
export function BuildArtifact({
  query,
  profile,
}: {
  query: string;
  profile: ShowcaseProfile | null;
}) {
  const character = findCharacter(profile, query);
  if (!character) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0b0b13] px-3 py-2.5 text-[11px] text-faint">
        {query} isn&apos;t on the loaded showcase, so there is no build card to show.
      </div>
    );
  }

  const role = character.kind === "zzz"
    ? `${character.profession} · Core ${character.coreRank}`
    : `${character.pathName} · E${character.eidolon}`;
  const stats = character.sheet.slice(0, 6);
  const mains = character.gear.slice(0, 6);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0b13]">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-medium text-white/90">{character.name}</span>
            <span className="text-[9px] text-[#f7d84a]">
              {"★".repeat(Math.max(0, Math.min(5, character.rarity)))}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-faint">
            Lv.{character.level} · {character.element} · {role}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-white/45">
          build
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2.5 sm:grid-cols-3">
        {stats.map((row) => (
          <div key={row.label} className="min-w-0">
            <p className="truncate text-[9.5px] uppercase tracking-[0.08em] text-faint">{row.label}</p>
            <p className="num truncate text-[11.5px] text-white/85">{row.value}</p>
          </div>
        ))}
      </div>

      {mains.length ? (
        <div className="flex flex-wrap gap-1 border-t border-white/[0.06] px-3 py-2">
          {mains.map((piece, index) => (
            <span
              key={`${piece.slot}-${index}`}
              className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[9.5px] text-white/60"
              title={piece.name}
            >
              {piece.slot} · {piece.main.label} {piece.main.value}
            </span>
          ))}
        </div>
      ) : null}

      {character.sets.length || character.weapon ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-white/[0.06] px-3 py-2">
          {character.weapon ? (
            <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] text-white/65">
              {character.weapon.name}
            </span>
          ) : null}
          {character.sets.map((set) => (
            <span
              key={set.id}
              className="rounded-md border border-[#7cf5d0]/20 bg-[#7cf5d0]/[0.07] px-1.5 py-0.5 text-[9.5px] text-[#a9f7e2]"
              title={set.bonus.join(" ")}
            >
              {set.pieces}pc {set.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CodeBlock({
  code,
  language,
  streaming,
}: {
  code: string;
  language?: string;
  streaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can be blocked; the text stays selectable.
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0b13]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1.5">
        <span className="text-[9.5px] uppercase tracking-[0.12em] text-faint">
          {streaming ? "writing…" : (language || "code")}
        </span>
        {streaming ? null : (
          <button
            type="button"
            onClick={copy}
            className="text-[9.5px] text-faint transition-colors hover:text-white/80"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-[11px] leading-relaxed text-white/75">
        <code className="num">{code}</code>
      </pre>
    </div>
  );
}
