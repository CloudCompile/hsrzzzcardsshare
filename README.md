# Astra — ZZZ & HSR showcase cards

Paste a Zenless Zone Zero or Honkai: Star Rail UID, get shareable showcase cards:

- **Character cards** — level, rarity, element/path, full stat sheet, W-Engine / light cone, drive discs or relics with main stat, sub stats and roll counts.
- **Team build cards** — pick a lineup from the showcase, name it, share the link or export a PNG.
- **PNG export** — every card and profile has a generated image at `/api/card/<game>/<uid>`. Add `?view=detail` for the full-sheet card: splash art, panel stats with the base + added split, W-Engine / light cone base stats, every relic sub stat with roll counts, and the set tally.
- **Manual mode** — no showcase, or building something new? At `/<game>/manual` you type the character, W-Engine/light cone, all six discs or relics and any extra stats yourself. The build is base64url-encoded into `?b=` so the link reproduces the card, and it renders a PNG at `/api/card/<game>/manual?b=…`. Builds autosave to this browser and show up under “Saved builds”.
- **Saved accounts & corrections** — looking a UID up saves it locally, and a character sheet has a “Corrections” panel for quick fixes (level, weapon level, any stat value) that apply to what you see and download without changing the shareable link.
- **Build agent** — at `/agent` you point Astra at any OpenAI-compatible provider (base URL, key, model) and ask about your builds. The model gets real tools: `list_agents`, `get_agent`, `get_team` and `search_catalog`, so it reads your actual showcase instead of guessing.

Next.js 15 (App Router) + Tailwind CSS 4, deploys to Vercel with no configuration.

## Data

| What | Source |
| --- | --- |
| Live showcase (player, characters, gear) | [Enka.Network](https://enka.network) public API |
| ZZZ agent / W-Engine / disc tables + English strings | `EnkaNetwork/API-docs` store |
| HSR characters, light cones, relic sets, elements, paths, stat curves, traces | `Mar-7th/StarRailRes` |

Static tables are baked into `lib/data/*.json` so the app only calls Enka at request time.
Refresh them after a game patch:

```bash
npm run data   # node scripts/gen-data.mjs
```

## Stat notes

- **HSR**: panel stats are computed as `(base + light cone base) × (1 + ratios) + flat`, from level/promotion curves, relic props, light-cone props and unlocked trace stats. Base HP/ATK/DEF are scaled by `1.8846`, the ratio between Enka's live level-80 base stats and the promotion tables (verified across all light cones on the sample account).
- **ZZZ**: drive disc values in the showcase are stored at +0 and scale by `1 + 0.2 × level`; sub stats are per-roll values × roll count. Panels combine agent level, promotion, core skill, W-Engine, discs and 2pc set bonuses. W-Engine stats use Enka's documented scaling — main stat `base × (1 + 0.1568166667 × level + 0.8922 × modification)`, sub stat `base × (1 + 0.3 × modification)` — which reproduces the in-game values (A-rank Lv.60 W1 = 416 ATK, S-rank Lv.60 ≈ 594). The API carries no W-Engine passive text and no 4pc set effects, so neither is modelled.

## Local data

Nothing is stored on a server. Everything below lives in `localStorage` under `astra:v1:*`:

| Key | What |
| --- | --- |
| `accounts`, `active-account` | UIDs you have looked up, with nicknames |
| `edits:<game>:<uid>` | Stat corrections for your own cards |
| `manual-draft:<game>:<charId>` | Autosaved manual builds |
| `agent:settings:<game>`, `agent:key:<game>` | Provider base URL, model and key (per game) |
| `agent:chat:<game>:<uid>` | Chat history |

The agent calls your provider straight from the browser and resolves tool calls locally against the loaded showcase. Supporting routes:

- `GET /api/showcase/<game>/<uid>` — the profile JSON the agent and other client features read.
- `GET /api/agent/catalog/<game>` — agent names, W-Engines / light cones and disc / relic set bonus text.
- `POST /api/agent/relay` — opt-in pass-through for providers that block browser CORS. The key is used only for that request.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Deploy

Import the repo into Vercel and deploy — no environment variables required. Set
`NEXT_PUBLIC_SITE_URL` if you use a custom domain so Open Graph URLs resolve absolutely.

Fan project, not affiliated with HoYoverse.

## Credits and licensing

Everything third-party the site leans on, and where it stands:

| What | Source | Terms |
| --- | --- | --- |
| Live showcase data | [Enka.Network](https://enka.network) API | Enka's API rules: custom `User-Agent`, no UID enumeration, honour `ttl`. All three are followed (`lib/enka.ts`). |
| ZZZ agent / W-Engine / disc tables, names, icons | `EnkaNetwork/API-docs` store | Public docs repo; data is HoYoverse's. Baked into `lib/data/*.json` by `scripts/gen-data.mjs`. |
| HSR characters, light cones, relics, traces, art | [Mar-7th/StarRailRes](https://github.com/Mar-7th/StarRailRes) | **AGPL-3.0.** Baked into `lib/data/*.json`; art and icons hotlinked from its jsDelivr CDN. |
| Game names, character art, in-game icons | HoYoverse / miHoYo | © HoYoverse. Used uncredited-by-licence under the fan-project understanding, not an actual grant. |
| Site backdrop, ZZZ | Game Rant (Valnet) | © Valnet / Game Rant. **Hotlinked with no licence granted** — the one asset here with no defensible basis. |
| Site backdrop, HSR | HoYoLAB BBS upload | A user upload of HoYoverse key art. Hotlinked; the poster's upload, not an official asset URL. |
| Fonts — Chakra Petch, Inter, JetBrains Mono | Google Fonts via `next/font` | SIL Open Font License 1.1. Self-hosted at build time; the OFL text is not shipped with them. |
| Next.js, React, Tailwind CSS | npm | MIT. |

This repository has no `LICENSE` file, so its own code is all rights reserved by default —
add one if you want others to be able to reuse it.

Outstanding decisions:

- **StarRailRes is AGPL-3.0.** The HSR tables in `lib/data/*.json` are derived from it, and its
  images are hotlinked. Attribution is in place but no licence notice or source offer is. Whether
  that copyleft reaches a site that only consumes the data is a question for someone qualified to
  answer it; the low-risk path is to switch the tables and art to Enka's own store, which has no
  such licence.
- **The ZZZ backdrop is a press-site image.** Replace it with a HoYoverse-hosted asset (HoYoLAB's
  upload CDN, as the HSR one uses) before the site gets traffic.
