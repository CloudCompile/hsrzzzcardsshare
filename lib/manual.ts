import * as hsr from "./hsr";
import * as zzz from "./zzz";
import { ZZZ_ELEMENT_LABELS, zzzElementColor } from "./site";
import type { Character, Game, GearPiece, SetGroup, ShowcaseProfile } from "./types";
import type { ManualBuild, ManualStatLine } from "./manualCodec";

export interface StatOption {
  key: string;
  label: string;
  pct: boolean;
}

/** Common drive disc / W-Engine stats, keyed by ZZZ prop id. */
const ZZZ_STATS: StatOption[] = [
  { key: "11103", label: "HP", pct: false },
  { key: "11102", label: "HP%", pct: true },
  { key: "12103", label: "ATK", pct: false },
  { key: "12102", label: "ATK%", pct: true },
  { key: "13103", label: "DEF", pct: false },
  { key: "13102", label: "DEF%", pct: true },
  { key: "12203", label: "Impact", pct: false },
  { key: "12202", label: "Impact%", pct: true },
  { key: "20103", label: "CRIT Rate", pct: true },
  { key: "21103", label: "CRIT DMG", pct: true },
  { key: "23201", label: "PEN", pct: false },
  { key: "23101", label: "PEN Ratio", pct: true },
  { key: "31203", label: "Anomaly Prof.", pct: false },
  { key: "31403", label: "Anomaly Mastery", pct: false },
  { key: "31402", label: "Anomaly Mastery%", pct: true },
  { key: "30502", label: "Energy Regen%", pct: true },
  { key: "31503", label: "Physical DMG%", pct: true },
  { key: "31603", label: "Fire DMG%", pct: true },
  { key: "31703", label: "Ice DMG%", pct: true },
  { key: "31803", label: "Electric DMG%", pct: true },
  { key: "31903", label: "Ether DMG%", pct: true },
  { key: "32303", label: "Wind DMG%", pct: true },
];

/** Common relic / light cone stats, keyed by HSR prop type. */
const HSR_STATS: StatOption[] = [
  "HPDelta",
  "HPRatio",
  "AttackDelta",
  "AttackAddedRatio",
  "DefenceDelta",
  "DefenceAddedRatio",
  "SpeedDelta",
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
  "BaseHP",
  "BaseAttack",
  "BaseDefence",
  "BaseSpeed",
].map((key) => ({ key, label: hsr.hsrPropLabel(key), pct: hsr.hsrStatIsPct(key) }));

export function statOptions(game: Game): StatOption[] {
  return game === "zzz" ? ZZZ_STATS : HSR_STATS;
}

function statLookup(game: Game): Map<string, StatOption> {
  return new Map(statOptions(game).map((option) => [option.key, option]));
}

export interface CatalogCharacter {
  id: string;
  name: string;
  rarity: number;
  element: string;
  icon: string | null;
}

export interface CatalogWeapon {
  id: string;
  name: string;
  rarity: number;
  subtitle: string;
  icon: string | null;
}

export interface CatalogSet {
  id: string;
  name: string;
  icon: string | null;
}

export interface ManualCatalog {
  characters: CatalogCharacter[];
  weapons: CatalogWeapon[];
  sets: CatalogSet[];
  slots: string[];
  maxLevel: number;
  rankLabel: string;
  rankMax: number;
}

export function manualCatalog(game: Game): ManualCatalog {
  if (game === "zzz") {
    return {
      characters: zzz.zzzAgentList(),
      weapons: zzz.zzzWeaponList().map((weapon) => ({
        id: weapon.id,
        name: weapon.name,
        rarity: weapon.rarity,
        subtitle: weapon.profession,
        icon: weapon.icon,
      })),
      sets: zzz.zzzSuitList(),
      slots: ["Disc 1", "Disc 2", "Disc 3", "Disc 4", "Disc 5", "Disc 6"],
      maxLevel: 60,
      rankLabel: "Core skill",
      rankMax: 6,
    };
  }

  return {
    characters: hsr.hsrCharacterList(),
    weapons: hsr.hsrLightConeList().map((cone) => ({
      id: cone.id,
      name: cone.name,
      rarity: cone.rarity,
      subtitle: hsr.hsrPathName(cone.path),
      icon: cone.icon,
    })),
    sets: hsr.hsrRelicSetList(),
    slots: hsr.hsrSlotNames(),
    maxLevel: 80,
    rankLabel: "Eidolon",
    rankMax: 6,
  };
}

function buildZzz(build: ManualBuild): Character | null {
  const agent = zzz.zzzAgentMeta(build.char);
  if (!agent) return null;

  const lookup = statLookup("zzz");
  const acc = new Map<string, number>();
  const addLine = (line: ManualStatLine) => {
    const option = lookup.get(line.k);
    if (!option) return;
    // ZZZ props keep percent stats as percent x100.
    const raw = option.pct ? line.v * 100 : line.v;
    acc.set(line.k, (acc.get(line.k) ?? 0) + raw);
  };

  const label = (key: string) => lookup.get(key)?.label ?? zzz.zzzPropLabel(key);
  const display = (line: ManualStatLine) => {
    const option = lookup.get(line.k);
    return zzz.zzzFormatStat(line.k, option?.pct ? line.v * 100 : line.v);
  };

  for (const line of build.weaponStats) addLine(line);
  for (const line of build.extras) addLine(line);

  const setsMeta = new Map(zzz.zzzSuitList().map((suit) => [suit.id, suit]));
  const suitCounts = new Map<string, number>();
  const gear: GearPiece[] = [];

  for (const piece of build.pieces) {
    if (!piece.main && !piece.subs.length && !piece.set) continue;
    for (const line of piece.subs) addLine(line);
    if (piece.main) addLine(piece.main);
    if (piece.set) suitCounts.set(piece.set, (suitCounts.get(piece.set) ?? 0) + 1);

    const suit = setsMeta.get(piece.set);
    gear.push({
      slot: String(piece.slot),
      name: suit?.name ?? "Custom disc",
      rarity: 5,
      level: piece.level,
      icon: suit?.icon ?? null,
      main: piece.main
        ? { label: label(piece.main.k), value: display(piece.main) }
        : { label: "—", value: "—" },
      subs: piece.subs.map((line) => ({ label: label(line.k), value: display(line) })),
    });
  }
  gear.sort((a, b) => Number(a.slot) - Number(b.slot));

  const sets: SetGroup[] = zzz.zzzBuildSets(suitCounts, acc);
  const rawElement = agent.elements[0] ?? "Physical";
  const weaponStats = build.weapon
    ? zzz.zzzWeaponStats(build.weapon, build.weaponLevel, build.weaponRank || 1)
    : null;
  if (weaponStats) {
    for (const [id, value] of weaponStats.acc) acc.set(id, (acc.get(id) ?? 0) + value);
  }
  const sheet = zzz.zzzBuildSheet(
    zzz.zzzBaseReader(build.char, build.level, build.promotion, build.rank),
    acc,
    rawElement,
    weaponStats?.base,
  );

  const weaponMeta = build.weapon ? zzz.zzzWeaponMeta(build.weapon) : undefined;

  return {
    kind: "zzz",
    id: build.char,
    name: agent.name,
    rarity: agent.rarity,
    level: build.level,
    element: ZZZ_ELEMENT_LABELS[rawElement] ?? rawElement,
    elementColor: zzzElementColor(rawElement),
    profession: agent.profession,
    promotion: build.promotion,
    core: build.rank,
    coreRank: zzz.zzzCoreRank(build.rank),
    mindscape: 0,
    skillLevels: [],
    icon: agent.circle ?? agent.icon,
    portrait: agent.icon,
    accent: agent.accent,
    sheet,
    sets,
    gear,
    weapon: weaponMeta
      ? {
          id: build.weapon,
          name: weaponMeta.name,
          rarity: weaponMeta.rarity,
          level: build.weaponLevel,
          effect: build.weaponRank || 1,
          modification: weaponStats?.modification ?? Math.max(0, build.weaponRank || 1),
          stats: weaponStats?.stats,
          icon: weaponMeta.icon,
          subtitle: weaponMeta.profession,
          base: null,
        }
      : null,
  };
}

function buildHsr(build: ManualBuild): Character | null {
  const meta = hsr.hsrCharacterMeta(build.char);
  if (!meta) return null;

  const lookup = statLookup("hsr");
  const acc = new Map<string, number>();
  const addLine = (line: ManualStatLine) => {
    const option = lookup.get(line.k);
    if (!option) return;
    // HSR props keep percent stats as ratios.
    const value = option.pct ? line.v / 100 : line.v;
    acc.set(line.k, (acc.get(line.k) ?? 0) + value);
  };

  const label = (key: string) => lookup.get(key)?.label ?? hsr.hsrPropLabel(key);
  const display = (line: ManualStatLine) => {
    const option = lookup.get(line.k);
    return hsr.hsrPropValue({ type: line.k, value: option?.pct ? line.v / 100 : line.v });
  };

  for (const line of build.weaponStats) addLine(line);
  for (const line of build.extras) addLine(line);

  const setMeta = new Map(hsr.hsrRelicSetList().map((set) => [set.id, set]));
  const slots = hsr.hsrSlotNames();
  const setCounts = new Map<string, number>();
  const gear: GearPiece[] = [];

  for (const piece of build.pieces) {
    if (!piece.main && !piece.subs.length && !piece.set) continue;
    for (const line of piece.subs) addLine(line);
    if (piece.main) addLine(piece.main);
    if (piece.set) setCounts.set(piece.set, (setCounts.get(piece.set) ?? 0) + 1);

    const set = setMeta.get(piece.set);
    gear.push({
      slot: slots[piece.slot - 1] ?? `Slot ${piece.slot}`,
      name: set?.name ?? "Custom relic",
      rarity: 5,
      level: piece.level,
      icon: set?.icon ?? null,
      main: piece.main
        ? { label: label(piece.main.k), value: display(piece.main) }
        : { label: "—", value: "—" },
      subs: piece.subs.map((line) => ({ label: label(line.k), value: display(line) })),
    });
  }
  gear.sort((a, b) => slots.indexOf(a.slot) - slots.indexOf(b.slot));

  const sets: SetGroup[] = [...setCounts.entries()]
    .map(([id, pieces]) => {
      const set = hsr.hsrRelicSetMeta(id);
      const bonus: string[] = [];
      if (set?.desc?.[0] && pieces >= 2) bonus.push(`2pc — ${set.desc[0]}`);
      if (set?.desc?.[1] && pieces >= 4) bonus.push(`4pc — ${set.desc[1]}`);
      return {
        id,
        name: set?.name ?? setMeta.get(id)?.name ?? `Set ${id}`,
        pieces,
        icon: set?.icon ?? null,
        bonus,
      };
    })
    .sort((a, b) => b.pieces - a.pieces);

  const cone = build.weapon ? hsr.hsrLightConeMeta(build.weapon) : undefined;
  const coneBaseSum = (type: string) =>
    build.weaponStats.filter((line) => line.k === type).reduce((total, line) => total + line.v, 0);
  const coneBase = {
    hp: coneBaseSum("BaseHP"),
    atk: coneBaseSum("BaseAttack"),
    def: coneBaseSum("BaseDefence"),
  };

  return {
    kind: "hsr",
    id: build.char,
    name: meta.name,
    rarity: meta.rarity,
    level: build.level,
    element: meta.element,
    elementColor: hsr.hsrElementMeta(meta.element)?.color ?? "#c9c9c9",
    path: meta.path,
    pathName: hsr.hsrPathName(meta.path),
    pathIcon: null,
    eidolon: build.rank,
    traceCount: 0,
    icon: meta.icon,
    portrait: meta.portrait ?? meta.preview ?? meta.icon,
    accent: hsr.hsrElementMeta(meta.element)?.color ?? "#8ec5ff",
    sheet: hsr.hsrBuildSheet(hsr.hsrBaseStats(build.char, build.level), acc, meta.element),
    sets,
    gear,
    weapon: cone
      ? {
          id: build.weapon,
          name: cone.name,
          rarity: cone.rarity,
          level: build.weaponLevel,
          effect: build.weaponRank || 1,
          icon: cone.icon,
          subtitle: hsr.hsrPathName(cone.path),
          base: coneBase.hp || coneBase.atk || coneBase.def ? coneBase : null,
        }
      : null,
  };
}

export function buildManualProfile(game: Game, build: ManualBuild): ShowcaseProfile | null {
  const character = game === "zzz" ? buildZzz(build) : buildHsr(build);
  if (!character) return null;

  return {
    player: {
      game,
      uid: "manual",
      nickname: build.nickname.trim() || "Manual build",
      level: 0,
      signature: null,
      updatedAt: Date.now(),
    },
    characters: [character],
  };
}
