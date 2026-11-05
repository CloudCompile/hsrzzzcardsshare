import { buildHsrProfile, type RawHsr } from "./hsr";
import { buildZzzProfile, type RawZzz } from "./zzz";
import type { Game, ShowcaseProfile } from "./types";

export type ShowcaseErrorCode =
  | "invalid"
  | "notfound"
  | "maintenance"
  | "ratelimit"
  | "upstream"
  | "empty";

export class ShowcaseError extends Error {
  code: ShowcaseErrorCode;
  retryIn?: number;

  constructor(code: ShowcaseErrorCode, message: string, retryIn?: number) {
    super(message);
    this.name = "ShowcaseError";
    this.code = code;
    this.retryIn = retryIn;
  }
}

export const ERROR_COPY: Record<ShowcaseErrorCode, { title: string; body: string }> = {
  invalid: {
    title: "That UID doesn't look right",
    body: "UIDs are 8–10 digits, numbers only. You can find yours in game: menu → profile → UID.",
  },
  notfound: {
    title: "No showcase found for this UID",
    body: "Check the digits, make sure you picked the right game and server, and that your in-game profile showcase is set to public.",
  },
  maintenance: {
    title: "The game is updating",
    body: "Showcase data is unavailable during maintenance and for a while after a patch drops. Try again shortly.",
  },
  ratelimit: {
    title: "Showcase service is busy",
    body: "Enka.Network is rate limiting requests right now. Wait a few seconds and refresh.",
  },
  upstream: {
    title: "Couldn't reach the showcase service",
    body: "Enka.Network returned an unexpected response. Refresh in a moment — most of these clear on their own.",
  },
  empty: {
    title: "This showcase is empty",
    body: "Your in-game profile showcase has no characters set, or it's private. Set your showcase to public and refresh.",
  },
};

export function normalizeUid(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = String(input).replace(/[\s,]/g, "");
  return /^\d{8,10}$/.test(digits) ? digits : null;
}

const ENKA_BASE = "https://enka.network/api";
const USER_AGENT = "AstraShowcase/1.0 (+https://astra.show)";

async function enkaFetch<T>(game: Game, uid: string): Promise<T> {
  const url = `${ENKA_BASE}/${game}/uid/${uid}/`;
  let res: Response;

  try {
    res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      next: { revalidate: 180, tags: [`showcase:${game}:${uid}`] },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ShowcaseError("upstream", "Request to the showcase service failed.");
  }

  if (res.ok) {
    try {
      return (await res.json()) as T;
    } catch {
      throw new ShowcaseError("upstream", "Showcase service returned malformed data.");
    }
  }

  if (res.status === 400) {
    throw new ShowcaseError("invalid", "Invalid UID format.");
  }
  if (res.status === 404) {
    throw new ShowcaseError("notfound", "Player not found.");
  }
  if (res.status === 424) {
    throw new ShowcaseError("maintenance", "Game is under maintenance.");
  }
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { retry_in?: number };
    throw new ShowcaseError("ratelimit", "Rate limited by the showcase service.", body.retry_in);
  }
  throw new ShowcaseError("upstream", `Showcase service responded with ${res.status}.`);
}

export async function getShowcase(game: Game, uid: string): Promise<ShowcaseProfile> {
  if (game === "zzz") {
    const raw = await enkaFetch<RawZzz>("zzz", uid);
    const profile = buildZzzProfile(raw, uid);
    if (!profile.characters.length) throw new ShowcaseError("empty", "Showcase has no agents.");
    return profile;
  }

  const raw = await enkaFetch<RawHsr>("hsr", uid);
  const profile = buildHsrProfile(raw, uid);
  if (!profile.characters.length) throw new ShowcaseError("empty", "Showcase has no characters.");
  return profile;
}

export function errorFromUnknown(error: unknown): ShowcaseError {
  if (error instanceof ShowcaseError) return error;
  return new ShowcaseError("upstream", "Unexpected error while loading the showcase.");
}
