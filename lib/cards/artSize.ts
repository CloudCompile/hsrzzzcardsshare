const aspects = new Map<string, number>();

/**
 * Width / height of a portrait, read from the PNG header (bytes 16..24).
 *
 * Cards scale art to cover, so they need the real shape: assuming one ratio for a
 * whole game stretches every character whose art isn't that shape. Reading it means
 * the art is always enlarged past the card and clipped, never squashed into it.
 * Falls back to the caller's default if the image can't be read.
 */
export async function imageAspect(url: string | null, fallback: number): Promise<number> {
  if (!url) return fallback;

  const cached = aspects.get(url);
  if (cached) return cached;

  try {
    // Only the header is needed; both CDNs honour the range request.
    const response = await fetch(url, { headers: { Range: "bytes=0-1023" } });
    if (!response.ok) throw new Error(String(response.status));
    const bytes = new Uint8Array(await response.arrayBuffer());
    const isPng =
      bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (isPng) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint32(16);
      const height = view.getUint32(20);
      if (width > 0 && height > 0) {
        const aspect = width / height;
        aspects.set(url, aspect);
        return aspect;
      }
    }
  } catch {
    // Unknown artwork shape: fall back rather than fail the card.
  }

  aspects.set(url, fallback);
  return fallback;
}
