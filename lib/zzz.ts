import zzzJson from "./data/zzz.json";
import { zzzElementColor, ZZZ_ELEMENT_LABELS } from "./site";
import { fmtDecimal, fmtInt, fmtPct } from "./format";
import type { GearPiece, SetGroup, ShowcaseProfile, StatRow, WeaponInfo, ZzzCharacter } from "./types";

export interface PropMeta {
  label: string;
  pct: boolean;
  decimals: number;
}

interface AgentMeta {
  name: string;
  rarity: number;
  profession: string;
  elements: string[];
  icon: string | null;
  circle: string | null;
  weaponId: string | null;
  accent: string;
  accentExtra: string;
  base: Record<string, number>;
  growth: Record<string, number>;
  promotion: Record<string, number>[];
  core: Record<string, number>[];
}

interface WeaponMeta {
  name: string;
  rarity: number;
  profession: string;
  icon: string | null;
  main: { id: string; value: number } | null;
  sub: { id: string; value: number } | null;
}

interface SuitMeta {
  name: string;
  icon: string | null;
  bonus: Record<string, number>;
}

const data = zzzJson as unknown as {
  agents: Record<string, AgentMeta>;
  weapons: Record<string, WeaponMeta>;
  suits: Record<string, SuitMeta>;
  discToSuit: Record<string, string>;
  stats: Record<string, PropMeta>;
};

export interface RawZzzAvatar {
  Id: number;
  Level: number;
  PromotionLevel: number;
  TalentLevel: number;
  CoreSkillEnhancement: number;
  UpgradeId: number;
  WeaponEffectState: number;
  EquippedList?: {
    Slot: number;
    Equipment: {
      Id: number;
      Level: number;
      BreakLevel?: number;
      MainPropertyList?: { PropertyId: number; PropertyValue: number }[];
      RandomPropertyList?: { PropertyId: number; PropertyValue: number; PropertyLevel?: number }[];
    };
  }[];
  Weapon?: {
    Id: number;
    Level: number;
    UpgradeLevel?: number;
    BreakLevel?: number;
  };
}

export interface RawZzz {
  uid?: string;
  ttl?: number;
  region?: string;
  PlayerInfo?: {
    SocialDetail?: {
      Desc?: string;
      ProfileDetail?: {
        Nickname?: string;
        Level?: number;
        Uid?: number;
        PlatformType?: number;
      };
    };
    ShowcaseDetail?: { AvatarList?: RawZzzAvatar[] };
  };
}

const SLOTS = ["1", "2", "3", "4", "5", "6"];
const CORE_RANKS = ["", "A", "B", "C", "D", "E", "F"];

/** Drive disc values in the showcase are stored at +0; each level adds 20% of the base value. */
const MAIN_LEVEL_SCALE = 0.2;

function propMeta(id: string): PropMeta | undefined {
  return data.stats[id];
}

function formatProp(id: string, value: number): string {
  const meta = propMeta(id);
  if (!meta) return fmtInt(value);
  return meta.pct ? fmtPct(value / 100) : fmtInt(value);
}

function isPct(id: string): boolean {
  return propMeta(id)?.pct ?? false;
}

/** The store labels percent props "Percent HP"; the card should read "HP%". */
export function zzzPropLabel(id: string): string {
  const label = data.stats[id]?.label ?? "Stat";
  const percent = /^Percent (.+)$/.exec(label);
  if (percent) return `${percent[1]}%`;
  if (label === "Anomaly Proficiency") return "Anomaly Prof.";
  if (label === "Anomaly Mastery") return "Anomaly Mastery";
  return label;
}

function add(map: Map<string, number>, id: string | number | undefined, value: number) {
  if (id === undefined || id === null) return;
  const key = String(id);
  map.set(key, (map.get(key) ?? 0) + value);
}

/** Base agent stat at the shown level, promotion and core skill rank. */
function makeBaseReader(meta: AgentMeta, level: number, promotion: number, core: number) {
  const promoIndex = Math.max(0, Math.min(promotion, meta.promotion.length - 1));
  const coreIndex = Math.max(0, Math.min(core, meta.core.length - 1));
  return (id: string): number => {
    const base = meta.base[id] ?? 0;
    const growth = ((meta.growth[id] ?? 0) * (level - 1)) / 10000;
    const promo = meta.promotion[promoIndex]?.[id] ?? 0;
    const coreBonus = meta.core[coreIndex]?.[id] ?? 0;
    return base + growth + promo + coreBonus;
  };
}

function buildWeapon(avatar: RawZzzAvatar): WeaponInfo | null {
  const raw = avatar.Weapon;
  if (!raw) return null;
  const meta = data.weapons[String(raw.Id)];
  if (!meta) return null;
  return {
    id: String(raw.Id),
    name: meta.name,
    rarity: meta.rarity,
    level: raw.Level,
    effect: avatar.WeaponEffectState || 1,
    icon: meta.icon,
    subtitle: meta.profession,
  };
}

function buildGear(avatar: RawZzzAvatar, acc: Map<string, number>) {
  const pieces: GearPiece[] = [];
  const suitCounts = new Map<string, number>();

  for (const slot of avatar.EquippedList ?? []) {
    const equipment = slot?.Equipment;
    if (!equipment) continue;
    const suitId = data.discToSuit[String(equipment.Id)];
    const suit = suitId ? data.suits[suitId] : undefined;
    if (suitId) suitCounts.set(suitId, (suitCounts.get(suitId) ?? 0) + 1);

    const mainProp = equipment.MainPropertyList?.[0];
    let main: GearPiece["main"] = { label: "—", value: "—" };
    if (mainProp) {
      const id = String(mainProp.PropertyId);
      const scaled = mainProp.PropertyValue * (1 + MAIN_LEVEL_SCALE * equipment.Level);
      add(acc, id, scaled);
      main = { label: zzzPropLabel(id), value: formatProp(id, scaled) };
    }

    const subs = (equipment.RandomPropertyList ?? []).map((sub) => {
      const id = String(sub.PropertyId);
      const rolls = Math.max(1, sub.PropertyLevel ?? 1);
      const total = sub.PropertyValue * rolls;
      add(acc, id, total);
      return {
        label: zzzPropLabel(id),
        value: formatProp(id, total),
        rolls,
      };
    });

    pieces.push({
      slot: slot.Slot ? SLOTS[slot.Slot - 1] ?? String(slot.Slot) : "?",
      name: suit?.name ?? `Disc ${equipment.Id}`,
      rarity: equipment.BreakLevel ?? 0,
      level: equipment.Level,
      icon: suit?.icon ?? null,
      main,
      subs,
    });
  }

  pieces.sort((a, b) => Number(a.slot) - Number(b.slot));
  return { pieces, suitCounts };
}

function buildSets(suitCounts: Map<string, number>, acc: Map<string, number>): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const [suitId, pieces] of suitCounts) {
    const suit = data.suits[suitId];
    if (!suit) continue;
    const bonus: string[] = [];
    if (pieces >= 2) {
      for (const [propId, value] of Object.entries(suit.bonus)) {
        add(acc, propId, value);
        const label = zzzPropLabel(propId);
        if (!data.stats[propId]) continue;
        bonus.push(`${isPct(propId) ? `+${fmtPct(value / 100)}` : `+${fmtInt(value)}`} ${label}`);
      }
    }
    groups.push({
      id: suitId,
      name: suit.name,
      pieces,
      icon: suit.icon,
      bonus,
    });
  }
  return groups.sort((a, b) => b.pieces - a.pieces);
}

const ELEMENT_DMG_PROP: Record<string, string> = {
  Physical: "31503",
  Fire: "31603",
  Ice: "31703",
  Elec: "31803",
  Ether: "31903",
  Wind: "32303",
};

function buildSheet(
  baseAt: (id: string) => number,
  acc: Map<string, number>,
  element: string,
): StatRow[] {
  const elementLabel = ZZZ_ELEMENT_LABELS[element] ?? element;
  const raw = (id: string) => acc.get(id) ?? 0;
  const pct = (id: string) => raw(id) / 100;

  const compose = (baseId: string, flatId: string, pctId: string) =>
    baseAt(baseId) * (1 + pct(pctId) / 100) + raw(flatId);

  /** "1,234 + 567": the agent's own stat, then everything discs and set bonuses add. */
  const split = (total: number, start: number) =>
    total - start >= 0.5 ? `${fmtInt(start)} + ${fmtInt(total - start)}` : undefined;
  const gained = (value: number) => (value >= 0.5 ? `+${fmtPct(value / 100)}` : undefined);

  const hp = compose("11101", "11103", "11102");
  const atk = compose("12101", "12103", "12102");
  const def = compose("13101", "13103", "13102");
  const impact = compose("12201", "12203", "12202");

  const rows: StatRow[] = [
    { label: "HP", value: fmtInt(hp), detail: split(hp, baseAt("11101")) },
    { label: "ATK", value: fmtInt(atk), detail: split(atk, baseAt("12101")) },
    { label: "DEF", value: fmtInt(def), detail: split(def, baseAt("13101")) },
    {
      label: "Impact",
      value: fmtInt(impact),
      hint: "Daze",
      detail: split(impact, baseAt("12201")),
    },
    {
      label: "CRIT Rate",
      value: fmtPct((baseAt("20101") + raw("20103")) / 100),
      detail: gained(raw("20103")),
    },
    {
      label: "CRIT DMG",
      value: fmtPct((baseAt("21101") + raw("21103")) / 100),
      detail: gained(raw("21103")),
    },
    {
      label: "Anomaly Prof.",
      value: fmtInt(baseAt("31201") + raw("31203")),
      detail: split(baseAt("31201") + raw("31203"), baseAt("31201")),
    },
    {
      label: "Anomaly Mastery",
      value: fmtDecimal((baseAt("31401") + raw("31403")) * (1 + pct("31402") / 100), 0),
    },
    { label: "PEN Ratio", value: fmtPct((baseAt("23101") + raw("23103")) / 100) },
    { label: "PEN", value: fmtInt(baseAt("23201") + raw("23203")) },
  ];

  // A handful of agents have no energy regen row in the tables; skip instead of showing 0.00.
  const energyBase = (baseAt("30501") + raw("30503")) / 100;
  if (energyBase > 0) {
    rows.push({
      label: "Energy Regen",
      value: fmtDecimal(energyBase * (1 + pct("30502") / 100), 2),
    });
  }

  const dmgId = ELEMENT_DMG_PROP[element];
  if (dmgId) {
    const bonus = pct(dmgId);
    if (bonus > 0) {
      rows.push({
        label: `${elementLabel} DMG`,
        value: fmtPct(bonus),
      });
    }
  }

  return rows;
}

export function buildZzzProfile(raw: RawZzz, requestedUid: string): ShowcaseProfile {
  const social = raw.PlayerInfo?.SocialDetail;
  const avatars = raw.PlayerInfo?.ShowcaseDetail?.AvatarList ?? [];
  const detail = social?.ProfileDetail;

  const characters: ZzzCharacter[] = [];

  for (const avatar of avatars) {
    const meta = data.agents[String(avatar.Id)];
    if (!meta) continue;

    const baseAt = makeBaseReader(meta, avatar.Level, avatar.PromotionLevel, avatar.CoreSkillEnhancement);
    const acc = new Map<string, number>();
    const { pieces, suitCounts } = buildGear(avatar, acc);
    const sets = buildSets(suitCounts, acc);
    const rawElement = meta.elements[0] ?? "Physical";
    const element = ZZZ_ELEMENT_LABELS[rawElement] ?? rawElement;
    const sheet = buildSheet(baseAt, acc, rawElement);

    characters.push({
      kind: "zzz",
      id: String(avatar.Id),
      name: meta.name,
      rarity: meta.rarity,
      level: avatar.Level,
      element,
      elementColor: zzzElementColor(rawElement),
      profession: meta.profession,
      promotion: avatar.PromotionLevel,
      core: avatar.CoreSkillEnhancement,
      coreRank: CORE_RANKS[Math.max(0, Math.min(6, avatar.CoreSkillEnhancement))] || "—",
      icon: meta.circle ?? meta.icon,
      portrait: meta.icon,
      accent: meta.accent,
      sheet,
      sets,
      gear: pieces,
      weapon: buildWeapon(avatar),
    });
  }

  characters.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));

  return {
    player: {
      game: "zzz",
      uid: raw.uid ? String(raw.uid) : requestedUid,
      nickname: detail?.Nickname || "Proxy",
      level: detail?.Level ?? 0,
      signature: social?.Desc?.trim() || null,
      platform: detail?.PlatformType ? String(detail.PlatformType) : undefined,
      region: raw.region,
      updatedAt: Date.now(),
    },
    characters,
  };
}

export function zzzAgentMeta(id: string) {
  return data.agents[id];
}

export function zzzWeaponMeta(id: string) {
  return data.weapons[id];
}

export function zzzStatMeta(id: string): PropMeta | undefined {
  return data.stats[id];
}

/** Formats a raw stat value (percent stats are stored as percent x100). */
export function zzzFormatStat(id: string, value: number): string {
  return formatProp(id, value);
}

/** Base agent stat reader: level + promotion + core skill bonuses. */
export function zzzBaseReader(id: string, level: number, promotion: number, core: number) {
  const meta = data.agents[id];
  if (!meta) return (): number => 0;
  return makeBaseReader(meta, level, promotion, core);
}

export function zzzCoreRank(rank: number): string {
  return CORE_RANKS[Math.max(0, Math.min(6, rank))] || "—";
}

export interface ZzzAgentOption {
  id: string;
  name: string;
  rarity: number;
  profession: string;
  element: string;
  icon: string | null;
}

export function zzzAgentList(): ZzzAgentOption[] {
  return Object.entries(data.agents)
    .map(([id, meta]) => ({
      id,
      name: meta.name,
      rarity: meta.rarity,
      profession: meta.profession,
      element: ZZZ_ELEMENT_LABELS[meta.elements[0]] ?? meta.elements[0] ?? "Physical",
      icon: meta.circle ?? meta.icon,
    }))
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
}

export interface ZzzWeaponOption {
  id: string;
  name: string;
  rarity: number;
  profession: string;
  icon: string | null;
}

export function zzzWeaponList(): ZzzWeaponOption[] {
  return Object.entries(data.weapons)
    .map(([id, meta]) => ({
      id,
      name: meta.name,
      rarity: meta.rarity,
      profession: meta.profession,
      icon: meta.icon,
    }))
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
}

export interface ZzzSuitOption {
  id: string;
  name: string;
  icon: string | null;
}

export function zzzSuitList(): ZzzSuitOption[] {
  return Object.entries(data.suits)
    .map(([id, meta]) => ({ id, name: meta.name, icon: meta.icon }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export { buildSheet as zzzBuildSheet, buildSets as zzzBuildSets };
