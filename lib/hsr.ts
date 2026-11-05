import hsrJson from "./data/hsr.json";
import { fmtDecimal, fmtInt, fmtPct } from "./format";
import type {
  GearPiece,
  HsrCharacter,
  SetGroup,
  ShowcaseProfile,
  StatRow,
  WeaponInfo,
} from "./types";

export interface CharacterMeta {
  name: string;
  rarity: number;
  element: string;
  path: string;
  icon: string | null;
  portrait: string | null;
  preview: string | null;
}

export interface LightConeMeta {
  name: string;
  rarity: number;
  path: string;
  icon: string | null;
}

export interface RelicSetMeta {
  name: string;
  icon: string | null;
  desc?: string[];
}

interface ElementMeta {
  name: string;
  color: string;
  icon: string | null;
}

interface PathMeta {
  name: string;
  icon: string | null;
}

interface TraceNode {
  max: number;
  steps: [number, [string, number][]][];
}

const data = hsrJson as unknown as {
  characters: Record<string, CharacterMeta>;
  lightCones: Record<string, LightConeMeta>;
  relicSets: Record<string, RelicSetMeta>;
  elements: Record<string, ElementMeta>;
  paths: Record<string, PathMeta>;
  curves: Record<string, Record<string, [number, number]>[]>;
  traces: Record<string, TraceNode>;
};

export type Prop = { type: string; value: number };

export interface RawHsrAvatar {
  avatarId: number;
  level: number;
  promotion: number;
  rank: number;
  equipment?: {
    tid: number;
    rank: number;
    level: number;
    _flat?: { props?: Prop[]; name?: string };
  } | null;
  relicList?: {
    tid: number;
    type: number;
    level: number;
    mainAffixId: number;
    _flat?: { props?: Prop[]; setID?: number | string };
  }[];
  skillTreeList?: { pointId: number; level: number }[];
}

export interface RawHsr {
  uid?: string;
  ttl?: number;
  region?: string;
  detailInfo?: {
    nickname?: string;
    level?: number;
    worldLevel?: number;
    signature?: string;
    platform?: string;
    recordInfo?: { achievementCount?: number; avatarCount?: number };
    avatarDetailList?: RawHsrAvatar[];
  };
}

const SLOT_NAMES = ["Head", "Hands", "Body", "Feet", "Planar Sphere", "Link Rope"];

const PERCENT_PROPS = new Set([
  "HPAddedRatio",
  "BreakDamageAddedRatioBase",
  "HPRatio",
  "AttackAddedRatio",
  "DefenceAddedRatio",
  "SpeedAddedRatio",
  "CriticalChance",
  "CriticalDamage",
  "BreakDamageAddedRatio",
  "StatusProbability",
  "StatusResistance",
  "SPRatio",
  "HealRatioBase",
  "PhysicalAddedRatio",
  "FireAddedRatio",
  "IceAddedRatio",
  "ThunderAddedRatio",
  "WindAddedRatio",
  "QuantumAddedRatio",
  "ImaginaryAddedRatio",
  "AddedRatio",
]);

const PROP_LABELS: Record<string, string> = {
  HPDelta: "HP",
  HPRatio: "HP%",
  HPAddedRatio: "HP%",
  AttackDelta: "ATK",
  AttackAddedRatio: "ATK%",
  DefenceDelta: "DEF",
  DefenceAddedRatio: "DEF%",
  SpeedDelta: "SPD",
  SpeedAddedRatio: "SPD%",
  CriticalChance: "CRIT Rate",
  CriticalDamage: "CRIT DMG",
  BreakDamageAddedRatio: "Break Effect",
  BreakDamageAddedRatioBase: "Break Effect",
  StatusProbability: "Effect Hit Rate",
  StatusResistance: "Effect RES",
  SPRatio: "Energy Regen",
  HealRatioBase: "Outgoing Healing",
  PhysicalAddedRatio: "Physical DMG",
  FireAddedRatio: "Fire DMG",
  IceAddedRatio: "Ice DMG",
  ThunderAddedRatio: "Lightning DMG",
  WindAddedRatio: "Wind DMG",
  QuantumAddedRatio: "Quantum DMG",
  ImaginaryAddedRatio: "Imaginary DMG",
  AddedRatio: "DMG Boost",
};

export function hsrPropLabel(type: string): string {
  return PROP_LABELS[type] ?? type.replace(/([A-Z])/g, " $1").trim();
}

export function hsrPropValue(prop: Prop): string {
  // Unresolved affixes arrive with a zero value; show a dash rather than a fake 0.
  if (Math.abs(prop.value) < 0.0001) return "—";
  return PERCENT_PROPS.has(prop.type) ? fmtPct(prop.value * 100) : fmtDecimal(prop.value, 0);
}

/**
 * The promotion tables in StarRailRes hold the raw game values, while Enka exposes
 * level-80 base stats for light cones on the in-game scale. Those live values are a
 * constant 1.8846x the table values, and characters share the same level curve, so
 * base HP/ATK/DEF are scaled by that factor to land on in-game numbers.
 */
const BASE_STAT_SCALE = 1.8846;

/** Promotion band for a level: 0 -> 1-20, then 10-level bands up to 6 -> 71-80. */
function promoIndexFor(level: number): number {
  if (level <= 20) return 0;
  if (level <= 30) return 1;
  if (level <= 40) return 2;
  if (level <= 50) return 3;
  if (level <= 60) return 4;
  if (level <= 70) return 5;
  return 6;
}

const PROMO_START = [1, 20, 30, 40, 50, 60, 70];

function baseStat(
  curves: Record<string, [number, number]>[] | undefined,
  stat: string,
  level: number,
): number {
  if (!curves) return 0;
  const index = promoIndexFor(level);
  const curve = curves[index]?.[stat];
  if (!curve) return 0;
  const [base, step] = curve;
  return base + step * (level - PROMO_START[index]);
}

/** Enka spells a few props differently from the names the panel math sums. */
const PROP_ALIASES: Record<string, string> = {
  HPAddedRatio: "HPRatio",
  BreakDamageAddedRatioBase: "BreakDamageAddedRatio",
};

const ELEMENT_PROP: Record<string, string> = {
  Physical: "PhysicalAddedRatio",
  Fire: "FireAddedRatio",
  Ice: "IceAddedRatio",
  Lightning: "ThunderAddedRatio",
  Wind: "WindAddedRatio",
  Quantum: "QuantumAddedRatio",
  Imaginary: "ImaginaryAddedRatio",
};

export function buildHsrProfile(raw: RawHsr, requestedUid: string): ShowcaseProfile {
  const detail = raw.detailInfo;
  const avatars = detail?.avatarDetailList ?? [];
  const characters: HsrCharacter[] = [];

  for (const avatar of avatars) {
    const meta = data.characters[String(avatar.avatarId)];
    if (!meta) continue;

    const acc = new Map<string, number>();
    const addProp = (prop: Prop) => {
      const type = PROP_ALIASES[prop.type] ?? prop.type;
      acc.set(type, (acc.get(type) ?? 0) + prop.value);
    };

    const base = hsrBaseStats(String(avatar.avatarId), avatar.level);

    // Light cone: base stats are already scaled to its level, ratios/boosts are additive.
    const lightCone = avatar.equipment;
    const lcMeta = lightCone ? data.lightCones[String(lightCone.tid)] : undefined;
    let weapon: WeaponInfo | null = null;
    if (lightCone && lcMeta) {
      const coneBase = { hp: 0, atk: 0, def: 0 };
      for (const prop of lightCone._flat?.props ?? []) {
        if (prop.type === "BaseHP") {
          coneBase.hp += prop.value;
          acc.set("BaseHP", (acc.get("BaseHP") ?? 0) + prop.value);
        } else if (prop.type === "BaseAttack") {
          coneBase.atk += prop.value;
          acc.set("BaseAttack", (acc.get("BaseAttack") ?? 0) + prop.value);
        } else if (prop.type === "BaseDefence") {
          coneBase.def += prop.value;
          acc.set("BaseDefence", (acc.get("BaseDefence") ?? 0) + prop.value);
        } else addProp(prop);
      }
      weapon = {
        id: String(lightCone.tid),
        name: lcMeta.name,
        rarity: lcMeta.rarity,
        level: lightCone.level,
        effect: lightCone.rank,
        icon: lcMeta.icon,
        subtitle: data.paths[lcMeta.path]?.name ?? lcMeta.path,
        base: coneBase.hp || coneBase.atk || coneBase.def ? coneBase : null,
      };
    }

    // Traces: sum the stat steps unlocked at the level shown in the showcase.
    let traceCount = 0;
    for (const trace of avatar.skillTreeList ?? []) {
      traceCount += 1;
      const node = data.traces[String(trace.pointId)];
      if (!node) continue;
      for (const [stepLevel, props] of node.steps) {
        if (stepLevel >= trace.level) continue;
        for (const [type, value] of props) addProp({ type, value });
      }
    }

    // Relics: props arrive fully resolved (main first, then sub stats).
    const pieces: GearPiece[] = [];
    const setCounts = new Map<number, number>();
    for (const relic of avatar.relicList ?? []) {
      const props = relic._flat?.props ?? [];
      for (const prop of props) addProp(prop);
      const setID = Number(relic._flat?.setID ?? 0);
      if (setID) setCounts.set(setID, (setCounts.get(setID) ?? 0) + 1);
      const setMeta = data.relicSets[String(setID)];
      const main = props[0];
      pieces.push({
        slot: SLOT_NAMES[relic.type - 1] ?? `Relic ${relic.type}`,
        name: setMeta?.name ?? `Relic ${relic.tid}`,
        rarity: 0,
        level: relic.level,
        icon: setMeta?.icon ?? null,
        main: main
          ? { label: hsrPropLabel(main.type), value: hsrPropValue(main) }
          : { label: "—", value: "—" },
        subs: props.slice(1).map((prop) => ({
          label: hsrPropLabel(prop.type),
          value: hsrPropValue(prop),
        })),
      });
    }
    pieces.sort((a, b) => SLOT_NAMES.indexOf(a.slot) - SLOT_NAMES.indexOf(b.slot));

    const sets: SetGroup[] = [...setCounts.entries()]
      .map(([setID, pieces]) => {
        const meta2 = data.relicSets[String(setID)];
        const bonus: string[] = [];
        if (meta2?.desc?.[0] && pieces >= 2) bonus.push(`2pc — ${meta2.desc[0]}`);
        if (meta2?.desc?.[1] && pieces >= 4) bonus.push(`4pc — ${meta2.desc[1]}`);
        return {
          id: String(setID),
          name: meta2?.name ?? `Set ${setID}`,
          pieces,
          icon: meta2?.icon ?? null,
          bonus,
        };
      })
      .sort((a, b) => b.pieces - a.pieces);

    const sheet = hsrBuildSheet(base, acc, meta.element);

    characters.push({
      kind: "hsr",
      id: String(avatar.avatarId),
      name: meta.name,
      rarity: meta.rarity,
      level: avatar.level,
      element: meta.element,
      elementColor: data.elements[meta.element]?.color ?? "#c9c9c9",
      path: meta.path,
      pathName: data.paths[meta.path]?.name ?? meta.path,
      pathIcon: data.paths[meta.path]?.icon ?? null,
      eidolon: avatar.rank,
      traceCount,
      icon: meta.icon,
      portrait: meta.portrait ?? meta.preview ?? meta.icon,
      accent: data.elements[meta.element]?.color ?? "#8ec5ff",
      sheet,
      sets,
      gear: pieces,
      weapon,
    });
  }

  characters.sort((a, b) => b.rarity - a.rarity || b.level - a.level || a.name.localeCompare(b.name));

  return {
    player: {
      game: "hsr",
      uid: raw.uid ? String(raw.uid) : requestedUid,
      nickname: detail?.nickname || "Trailblazer",
      level: detail?.level ?? 0,
      signature: detail?.signature?.trim() || null,
      worldLevel: detail?.worldLevel,
      achievements: detail?.recordInfo?.achievementCount,
      platform: detail?.platform,
      region: raw.region,
      updatedAt: Date.now(),
    },
    characters,
  };
}

function curveCrit(
  curves: Record<string, [number, number]>[] | undefined,
  stat: string,
  fallback: number,
): number {
  if (!curves) return fallback;
  const curve = curves[0]?.[stat];
  return curve?.[0] ?? fallback;
}

export function hsrElementMeta(element: string) {
  return data.elements[element];
}

export interface HsrBaseStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
}

/** Character base stats at a level, before light cones, relics and traces. */
export function hsrBaseStats(id: string, level: number): HsrBaseStats {
  const curves = data.curves[id];
  return {
    hp: baseStat(curves, "hp", level) * BASE_STAT_SCALE,
    atk: baseStat(curves, "atk", level) * BASE_STAT_SCALE,
    def: baseStat(curves, "def", level) * BASE_STAT_SCALE,
    spd: baseStat(curves, "spd", level),
    critRate: curveCrit(curves, "crit_rate", 0.05),
    critDmg: curveCrit(curves, "crit_dmg", 0.5),
  };
}

/** Panel rows from base stats plus an accumulated prop map (ratios for percent props). */
export function hsrBuildSheet(
  base: HsrBaseStats,
  acc: Map<string, number>,
  element: string,
): StatRow[] {
  const sum = (type: string) => acc.get(type) ?? 0;
  const hp = (base.hp + sum("BaseHP")) * (1 + sum("HPRatio")) + sum("HPDelta");
  const atk = (base.atk + sum("BaseAttack")) * (1 + sum("AttackAddedRatio")) + sum("AttackDelta");
  const def = (base.def + sum("BaseDefence")) * (1 + sum("DefenceAddedRatio")) + sum("DefenceDelta");
  const spd = (base.spd + sum("BaseSpeed")) * (1 + sum("SpeedAddedRatio")) + sum("SpeedDelta");

  /** "1411 + 800": the base stat, then everything gear, light cone and traces add. */
  const split = (total: number, start: number, decimals: number) =>
    total - start >= (decimals ? 0.05 : 0.5)
      ? `${fmtDecimal(start, decimals)} + ${fmtDecimal(total - start, decimals)}`
      : undefined;
  const gained = (ratio: number) => (ratio > 0.00005 ? `+${fmtPct(ratio * 100)}` : undefined);

  const rows: StatRow[] = [
    { label: "HP", value: fmtInt(hp), detail: split(hp, base.hp, 0) },
    { label: "ATK", value: fmtInt(atk), detail: split(atk, base.atk, 0) },
    { label: "DEF", value: fmtInt(def), detail: split(def, base.def, 0) },
    { label: "SPD", value: fmtDecimal(spd, 1), detail: split(spd, base.spd, 2) },
    {
      label: "CRIT Rate",
      value: fmtPct((base.critRate + sum("CriticalChance")) * 100),
      detail: gained(sum("CriticalChance")),
    },
    {
      label: "CRIT DMG",
      value: fmtPct((base.critDmg + sum("CriticalDamage")) * 100),
      detail: gained(sum("CriticalDamage")),
    },
    { label: "Break Effect", value: fmtPct(sum("BreakDamageAddedRatio") * 100) },
    { label: "Effect Hit", value: fmtPct(sum("StatusProbability") * 100) },
    { label: "Effect RES", value: fmtPct(sum("StatusResistance") * 100) },
    { label: "Energy Regen", value: fmtPct((1 + sum("SPRatio")) * 100) },
  ];

  const elementProp = ELEMENT_PROP[element];
  if (elementProp) {
    const bonus = sum(elementProp) + sum("AddedRatio");
    if (bonus > 0) {
      rows.push({ label: `${data.elements[element]?.name ?? element} DMG`, value: fmtPct(bonus * 100) });
    }
  }

  return rows;
}

export function hsrCharacterMeta(id: string): CharacterMeta | undefined {
  return data.characters[id];
}

export function hsrLightConeMeta(id: string): LightConeMeta | undefined {
  return data.lightCones[id];
}

export function hsrRelicSetMeta(id: string): RelicSetMeta | undefined {
  return data.relicSets[id];
}

export function hsrPathName(path: string): string {
  return data.paths[path]?.name ?? path;
}

export function hsrStatIsPct(type: string): boolean {
  return PERCENT_PROPS.has(type);
}

export function hsrSlotNames(): string[] {
  return [...SLOT_NAMES];
}

export function hsrCharacterList() {
  return Object.entries(data.characters)
    .map(([id, meta]) => ({
      id,
      name: meta.name,
      rarity: meta.rarity,
      element: meta.element,
      icon: meta.icon,
    }))
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
}

export function hsrLightConeList() {
  return Object.entries(data.lightCones)
    .map(([id, meta]) => ({
      id,
      name: meta.name,
      rarity: meta.rarity,
      path: meta.path,
      icon: meta.icon,
    }))
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
}

export function hsrRelicSetList() {
  return Object.entries(data.relicSets)
    .map(([id, meta]) => ({ id, name: meta.name, icon: meta.icon }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
