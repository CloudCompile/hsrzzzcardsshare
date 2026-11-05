export function fmtInt(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function fmtDecimal(value: number, decimals = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formats a percentage given in points (24.6 -> "24.6%"). */
export function fmtPct(points: number, decimals = 1): string {
  return `${fmtDecimal(points, decimals)}%`;
}

export function fmtStars(rarity: number): string {
  return "★".repeat(Math.max(0, Math.min(5, rarity)));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}
