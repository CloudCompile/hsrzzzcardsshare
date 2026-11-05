"use client";

import { useState } from "react";
import type { Character, ShowcaseProfile } from "@/lib/types";

export type ChartTone = "accent" | "good" | "warn" | "bad" | "muted";
export type ChartVariant = "bar" | "column";
export type ChartFormat = "number" | "percent" | "compact";

export interface ChartBar {
  label: string;
  value: number;
  target?: number;
  tone?: ChartTone;
}

export interface ChartSpec {
  title?: string;
  subtitle?: string;
  unit?: string;
  note?: string;
  max?: number;
  variant: ChartVariant;
  format?: ChartFormat;
  tone?: ChartTone;
  bars: ChartBar[];
}

/** Fill gradients the model can pick from, so a chart can carry meaning in colour. */
const TONES: Record<ChartTone, string> = {
  accent: "linear-gradient(90deg, #7c63d8, #a98bff)",
  good: "linear-gradient(90deg, #4fdcb4, #7cf5d0)",
  warn: "linear-gradient(90deg, #d99a2b, #f7d84a)",
  bad: "linear-gradient(90deg, #cf4f4a, #f77a6a)",
  muted: "linear-gradient(90deg, #3f3f4c, #6a6a7c)",
};

const TONE_KEYS = Object.keys(TONES) as ChartTone[];
const VARIANTS: ChartVariant[] = ["bar", "column"];
const FORMATS: ChartFormat[] = ["number", "percent", "compact"];

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pick<T extends string>(value: unknown, allowed: T[]): T | undefined {
  const needle = text(value)?.toLowerCase();
  return allowed.find((option) => option === needle);
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
      : Array.isArray(source.values)
        ? source.values
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
    bars.push({
      label,
      value,
      target: Number.isFinite(target) ? target : undefined,
      tone: pick(item.tone ?? item.color, TONE_KEYS),
    });
  }
  if (!bars.length) return null;

  const max = toNumber(source.max ?? source.scale);
  return {
    title: text(source.title),
    subtitle: text(source.subtitle ?? source.caption),
    unit: text(source.unit),
    note: text(source.note),
    max: Number.isFinite(max) && max > 0 ? max : undefined,
    variant: pick(source.variant ?? source.type ?? source.orientation, VARIANTS) ?? "bar",
    format: pick(source.format, FORMATS),
    tone: pick(source.tone ?? source.color, TONE_KEYS),
    bars,
  };
}

function formatValue(value: number, spec: ChartSpec): string {
  if (spec.format === "compact") {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
    if (abs >= 1_000) return `${Math.round(value / 100) / 10}k`;
  }
  const rounded = Math.round(value * 10) / 10;
  const body = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  if (spec.format === "percent" || spec.unit === "%") return `${body}%`;
  if (!spec.unit) return body;
  return `${body} ${spec.unit}`;
}

function barTone(spec: ChartSpec, bar: ChartBar): ChartTone {
  if (bar.tone) return bar.tone;
  const met = bar.target !== undefined && bar.value >= bar.target;
  if (met) return "good";
  return spec.tone ?? "accent";
}

export function ChartArtifact({ spec }: { spec: ChartSpec }) {
  const peak = Math.max(...spec.bars.map((bar) => Math.max(bar.value, bar.target ?? 0)), 1);
  const scale = spec.max ?? peak * 1.12;

  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0b13]">
      <figcaption className="flex items-baseline justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <span className="min-w-0">
          <span className="block truncate font-display text-[10.5px] uppercase tracking-[0.12em] text-white/70">
            {spec.title ?? "Comparison"}
          </span>
          {spec.subtitle ? (
            <span className="mt-0.5 block truncate text-[10px] text-faint">{spec.subtitle}</span>
          ) : null}
        </span>
        {spec.unit ? <span className="shrink-0 text-[10px] text-faint">{spec.unit}</span> : null}
      </figcaption>

      {spec.variant === "column" ? (
        <div className="flex items-end gap-2 px-3 pb-2 pt-3">
          {spec.bars.map((bar, index) => {
            const height = Math.max(3, Math.min(100, (bar.value / scale) * 100));
            const target =
              bar.target === undefined
                ? null
                : Math.max(0, Math.min(100, (bar.target / scale) * 100));
            return (
              <div key={`${bar.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="num text-[10px] text-white/80">{formatValue(bar.value, spec)}</span>
                <span className="relative h-16 w-full rounded-[3px] bg-white/[0.06]">
                  <span
                    className="absolute inset-x-0 bottom-0 rounded-[3px]"
                    style={{ height: `${height}%`, background: TONES[barTone(spec, bar)] }}
                  />
                  {target === null ? null : (
                    <span
                      className="absolute inset-x-0 border-t border-dashed border-white/45"
                      style={{ bottom: `${target}%` }}
                    />
                  )}
                </span>
                <span
                  className="w-full truncate text-center text-[10px] text-muted"
                  title={bar.label}
                >
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 px-3 py-2.5">
          {spec.bars.map((bar, index) => {
            const width = Math.max(2, Math.min(100, (bar.value / scale) * 100));
            const tick =
              bar.target === undefined
                ? null
                : Math.max(0, Math.min(100, (bar.target / scale) * 100));

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
                    style={{ width: `${width}%`, background: TONES[barTone(spec, bar)] }}
                  />
                  {tick === null ? null : (
                    <span
                      className="absolute -top-1 -bottom-1 w-px bg-white/40"
                      style={{ left: `${tick}%` }}
                    />
                  )}
                </span>
                <span className="num w-[74px] shrink-0 text-right text-[11px] text-white/85">
                  {formatValue(bar.value, spec)}
                  {bar.target === undefined ? null : (
                    <span className="ml-1 text-[9.5px] text-faint">
                      /{formatValue(bar.target, spec)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {spec.note ? (
        <p className="border-t border-white/[0.06] px-3 py-2 text-[10.5px] leading-relaxed text-faint">
          {spec.note}
        </p>
      ) : null}
    </figure>
  );
}

const BUILD_SECTIONS = ["stats", "gear", "weapon", "sets"] as const;
type BuildSection = (typeof BUILD_SECTIONS)[number];

export interface BuildSpec {
  query: string;
  title?: string;
  sections: BuildSection[];
  compact: boolean;
  highlight: string[];
}

/** Build blocks accept a bare name or JSON with section/emphasis choices. */
export function parseBuild(raw: string): BuildSpec {
  const source = raw.trim();
  let spec: BuildSpec = {
    query: source,
    sections: [...BUILD_SECTIONS],
    compact: false,
    highlight: [],
  };

  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    const query = text(parsed.agent) ?? text(parsed.name) ?? text(parsed.character);
    if (!query) return spec;

    const requested = Array.isArray(parsed.sections) ? parsed.sections : null;
    const sections = requested
      ? BUILD_SECTIONS.filter((section) =>
          requested.some((entry) => text(entry)?.toLowerCase() === section),
        )
      : [...BUILD_SECTIONS];
    const highlight = Array.isArray(parsed.highlight)
      ? parsed.highlight.map((entry) => text(entry)?.toLowerCase()).filter(Boolean)
      : [];

    spec = {
      query,
      title: text(parsed.title) ?? text(parsed.badge),
      sections: sections.length ? sections : [...BUILD_SECTIONS],
      compact: parsed.compact === true,
      highlight: highlight as string[],
    };
  } catch {
    // A bare name on its own line is the simple form.
  }

  return spec;
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
  spec,
  profile,
}: {
  spec: BuildSpec;
  profile: ShowcaseProfile | null;
}) {
  const character = findCharacter(profile, spec.query);
  if (!character) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0b0b13] px-3 py-2.5 text-[11px] text-faint">
        {spec.query} isn&apos;t on the loaded showcase, so there is no build card to show.
      </div>
    );
  }

  const role = character.kind === "zzz"
    ? `${character.profession} · Core ${character.coreRank}`
    : `${character.pathName} · E${character.eidolon}`;
  const stats = character.sheet.slice(0, spec.compact ? 4 : 6);
  const mains = spec.compact ? [] : character.gear.slice(0, 6);
  const show = (section: BuildSection) => spec.sections.includes(section);

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
          {spec.title ?? "build"}
        </span>
      </div>

      {show("stats") ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2.5 sm:grid-cols-3">
          {stats.map((row) => {
            const lit = spec.highlight.includes(row.label.toLowerCase());
            return (
              <div
                key={row.label}
                className={lit ? "-ml-1.5 border-l-2 border-[#7cf5d0] pl-1.5" : "min-w-0"}
              >
                <p
                  className={`truncate text-[9.5px] uppercase tracking-[0.08em] ${
                    lit ? "text-[#7cf5d0]/80" : "text-faint"
                  }`}
                >
                  {row.label}
                </p>
                <p className={`num truncate text-[11.5px] ${lit ? "text-white" : "text-white/85"}`}>
                  {row.value}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {show("gear") && mains.length ? (
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

      {(show("weapon") && character.weapon) || (show("sets") && character.sets.length) ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-white/[0.06] px-3 py-2">
          {show("weapon") && character.weapon ? (
            <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] text-white/65">
              {character.weapon.name}
            </span>
          ) : null}
          {show("sets")
            ? character.sets.map((set) => (
                <span
                  key={set.id}
                  className="rounded-md border border-[#7cf5d0]/20 bg-[#7cf5d0]/[0.07] px-1.5 py-0.5 text-[9.5px] text-[#a9f7e2]"
                  title={set.bonus.join(" ")}
                >
                  {set.pieces}pc {set.name}
                </span>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}

export interface NoteSpec {
  title?: string;
  body: string;
  tone: ChartTone;
}

const NOTE_TONES: Record<ChartTone, { border: string; bg: string; label: string }> = {
  accent: { border: "border-[#a98bff]/30", bg: "bg-[#a98bff]/[0.06]", label: "text-[#c9b8ff]" },
  good: { border: "border-[#7cf5d0]/30", bg: "bg-[#7cf5d0]/[0.06]", label: "text-[#a9f7e2]" },
  warn: { border: "border-[#f7d84a]/30", bg: "bg-[#f7d84a]/[0.06]", label: "text-[#f7e08a]" },
  bad: { border: "border-[#f77a6a]/30", bg: "bg-[#f77a6a]/[0.06]", label: "text-[#ffb3a8]" },
  muted: { border: "border-white/10", bg: "bg-white/[0.03]", label: "text-white/55" },
};

export function parseNote(raw: string): NoteSpec | null {
  const source = raw.trim();
  if (!source) return null;

  let spec: NoteSpec = { body: source, tone: "accent" };
  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    const body = text(parsed.body) ?? text(parsed.text) ?? text(parsed.note);
    if (body) {
      spec = {
        title: text(parsed.title) ?? text(parsed.label),
        body,
        tone: pick(parsed.tone ?? parsed.color, TONE_KEYS) ?? "accent",
      };
    }
  } catch {
    const titled = /^(accent|good|warn|bad|muted)[:\s]+([\s\S]+)$/i.exec(source);
    if (titled) {
      spec = {
        tone: titled[1].toLowerCase() as ChartTone,
        body: titled[2],
      };
    }
  }

  return spec;
}

export function NoteArtifact({ spec }: { spec: NoteSpec }) {
  const theme = NOTE_TONES[spec.tone];
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${theme.border} ${theme.bg}`}>
      {spec.title ? (
        <p
          className={`mb-1 text-[10px] uppercase tracking-[0.12em] ${theme.label}`}
        >
          {spec.title}
        </p>
      ) : null}
      <p className="text-[12px] leading-relaxed text-white/80">{spec.body}</p>
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
