/**
 * Bakes third-party static game data into compact JSON used by the app.
 *
 *   node scripts/gen-data.mjs
 *
 * Sources
 *  - Enka.Network API-docs store (agent/W-Engine/drive-disc tables + English strings)
 *  - Mar-7th/StarRailRes (character, light cone, relic set, element and path tables)
 *
 * The generated files are committed so the site never depends on these
 * endpoints at request time; re-run + commit when a new patch adds content.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "lib", "data");
const ENKA_STORE = "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store";
const ENKA_CDN = "https://enka.network";
const SRR_RAW = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en";
const SRR_CDN = "https://cdn.jsdelivr.net/gh/Mar-7th/StarRailRes@master/";

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "astra-showcase/1.0" } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (attempt === 2) throw new Error(`failed ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

const asCdn = (p) => (p ? ENKA_CDN + p : null);
const asSrr = (p) => (p ? SRR_CDN + p : null);

async function buildZzz() {
  const [avatars, locsFile, weapons, equipment, properties] = await Promise.all([
    getJson(`${ENKA_STORE}/zzz/avatars.json`),
    getJson(`${ENKA_STORE}/zzz/locs.json`),
    getJson(`${ENKA_STORE}/zzz/weapons.json`),
    getJson(`${ENKA_STORE}/zzz/equipments.json`),
    getJson(`${ENKA_STORE}/zzz/property.json`),
  ]);
  const locs = locsFile.en;

  const stats = {};
  for (const [id, prop] of Object.entries(properties)) {
    const name = prop?.Name;
    if (!name) continue;
    stats[id] = {
      label: locs[name] ?? name,
      pct: String(prop.Format ?? "").includes("%"),
      decimals: String(prop.Format ?? "").includes(".#") ? 1 : 0,
    };
  }

  const agents = {};
  for (const [id, a] of Object.entries(avatars)) {
    if (!a?.Name) continue;
    agents[id] = {
      name: locs[a.Name] ?? a.Name.replace(/^Avatar_/, ""),
      rarity: a.Rarity,
      profession: a.ProfessionType,
      elements: a.ElementTypes ?? [],
      icon: asCdn(a.Image),
      circle: asCdn(a.CircleIcon),
      weaponId: a.WeaponId ? String(a.WeaponId) : null,
      accent: a.Colors?.Accent ?? "#9d8cff",
      accentExtra: a.Colors?.AccentExtra ?? "#c9bfff",
      mindscapeColor: a.Colors?.Mindscape ?? "#ffffff",
      base: a.BaseProps ?? {},
      growth: a.GrowthProps ?? {},
      promotion: a.PromotionProps ?? [],
      core: a.CoreEnhancementProps ?? [],
    };
  }

  const weaponTable = {};
  for (const [id, w] of Object.entries(weapons)) {
    if (!w?.ItemName) continue;
    weaponTable[id] = {
      name: locs[w.ItemName] ?? w.ItemName.replace(/^Item_Weapon_/, ""),
      rarity: w.Rarity,
      profession: w.ProfessionType,
      icon: asCdn(w.ImagePath),
      main: w.MainStat ? { id: String(w.MainStat.PropertyId), value: w.MainStat.PropertyValue } : null,
      sub: w.SecondaryStat
        ? { id: String(w.SecondaryStat.PropertyId), value: w.SecondaryStat.PropertyValue }
        : null,
    };
  }

  const suits = {};
  for (const [id, s] of Object.entries(equipment.Suits ?? {})) {
    suits[id] = {
      name: locs[s.Name] ?? s.Name,
      icon: asCdn(s.Icon),
      bonus: s.SetBonusProps ?? {},
    };
  }

  const discToSuit = {};
  for (const [itemId, item] of Object.entries(equipment.Items ?? {})) {
    discToSuit[itemId] = String(item.SuitId);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    agents,
    weapons: weaponTable,
    suits,
    discToSuit,
    stats,
  };

  console.log(
    `zzz: ${Object.keys(agents).length} agents, ${Object.keys(weaponTable).length} w-engines, ` +
      `${Object.keys(suits).length} disc sets, ${Object.keys(stats).length} properties`,
  );
  return out;
}

async function buildHsr() {
  const [characters, lightCones, relicSets, elements, paths, promotions, skillTrees] =
    await Promise.all([
      getJson(`${SRR_RAW}/characters.json`),
      getJson(`${SRR_RAW}/light_cones.json`),
      getJson(`${SRR_RAW}/relic_sets.json`),
      getJson(`${SRR_RAW}/elements.json`),
      getJson(`${SRR_RAW}/paths.json`),
      getJson(`${SRR_RAW}/character_promotions.json`),
      getJson(`${SRR_RAW}/character_skill_trees.json`),
    ]);

  const chars = {};
  for (const [id, c] of Object.entries(characters)) {
    chars[id] = {
      name: c.name,
      rarity: c.rarity,
      element: c.element,
      path: c.path,
      icon: asSrr(c.icon),
      portrait: asSrr(c.portrait),
      preview: asSrr(c.preview),
    };
  }

  const lcTable = {};
  for (const [id, lc] of Object.entries(lightCones)) {
    lcTable[id] = {
      name: lc.name,
      rarity: lc.rarity,
      path: lc.path,
      icon: asSrr(lc.icon),
    };
  }

  const sets = {};
  for (const [id, s] of Object.entries(relicSets)) {
    sets[id] = { name: s.name, icon: asSrr(s.icon), desc: (s.desc ?? []).slice(0, 2) };
  }

  const elementTable = {};
  for (const [id, e] of Object.entries(elements)) {
    elementTable[id] = { name: e.name, color: e.color, icon: asSrr(e.icon) };
  }
  const pathTable = {};
  for (const [id, p] of Object.entries(paths)) {
    pathTable[id] = { name: p.name, icon: asSrr(p.icon) };
  }

  // Promotion curves: values[promotion] -> stat -> { base, step }; stat at level L = base + step*(L-1)
  const curves = {};
  for (const [id, promo] of Object.entries(promotions)) {
    const values = promo.values;
    if (!Array.isArray(values) || !values.length) continue;
    curves[id] = values.map((entry) =>
      Object.fromEntries(Object.entries(entry ?? {}).map(([k, v]) => [k, [v.base ?? 0, v.step ?? 0]])),
    );
  }

  // Trace (skill tree) stat bonuses. `steps` keeps the level index so the app can
  // sum only the bonuses unlocked at the level shown in the showcase.
  const traceProps = {};
  for (const [pointId, node] of Object.entries(skillTrees)) {
    const levels = node?.levels ?? [];
    const steps = [];
    levels.forEach((level, index) => {
      const props = level?.properties ?? [];
      if (props.length) steps.push([index, props.map((p) => [p.type, p.value])]);
    });
    if (!steps.length) continue;
    traceProps[pointId] = { max: node.max_level ?? levels.length, steps };
  }

  const out = {
    generatedAt: new Date().toISOString(),
    characters: chars,
    lightCones: lcTable,
    relicSets: sets,
    elements: elementTable,
    paths: pathTable,
    curves,
    traces: traceProps,
  };

  console.log(
    `hsr: ${Object.keys(chars).length} characters, ${Object.keys(lcTable).length} light cones, ` +
      `${Object.keys(sets).length} relic sets, ${Object.keys(traceProps).length} trace nodes`,
  );
  return out;
}

await fs.mkdir(OUT_DIR, { recursive: true });
const [zzz, hsr] = await Promise.all([buildZzz(), buildHsr()]);
await fs.writeFile(path.join(OUT_DIR, "zzz.json"), JSON.stringify(zzz));
await fs.writeFile(path.join(OUT_DIR, "hsr.json"), JSON.stringify(hsr));
console.log("wrote lib/data/zzz.json and lib/data/hsr.json");
