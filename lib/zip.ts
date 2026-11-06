/**
 * Minimal ZIP writer, store-only.
 *
 * Every card is a PNG, so deflate would only cost time; storing the bytes as they
 * arrive keeps this a few dozen lines with no dependency. Sizes above 4 GB and
 * ZIP64 are supported by neither the browser nor this app, so they are not handled.
 */
export interface ZipEntry {
  name: string;
  /** Raw file bytes; a fetch's `arrayBuffer()` is already exactly this. */
  data: ArrayBuffer;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(data: ArrayBuffer): number {
  const bytes = new Uint8Array(data);
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const UTF8_FLAG = 0x0800;
const DOS_DATE = 0x21; // 1980-01-01, the earliest a DOS timestamp can express.

export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const directory: BlobPart[] = [];
  let offset = 0;
  let directorySize = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const size = entry.data.byteLength;
    const crc = crc32(entry.data);

    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); // local file header
    localView.setUint16(4, 20, true); // version needed
    localView.setUint16(6, UTF8_FLAG, true);
    localView.setUint16(8, 0, true); // stored
    localView.setUint16(10, 0, true); // time
    localView.setUint16(12, DOS_DATE, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true); // compressed
    localView.setUint32(22, size, true); // uncompressed
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true); // extra length
    local.set(name, 30);

    parts.push(local, entry.data);

    const header = new Uint8Array(46 + name.length);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x02014b50, true); // central directory header
    headerView.setUint16(4, 20, true); // version made by
    headerView.setUint16(6, 20, true); // version needed
    headerView.setUint16(8, UTF8_FLAG, true);
    headerView.setUint16(10, 0, true);
    headerView.setUint16(12, 0, true);
    headerView.setUint16(14, DOS_DATE, true);
    headerView.setUint32(16, crc, true);
    headerView.setUint32(20, size, true);
    headerView.setUint32(24, size, true);
    headerView.setUint16(28, name.length, true);
    headerView.setUint32(42, offset, true); // local header offset
    header.set(name, 46);
    directory.push(header);
    directorySize += header.length;

    offset += local.length + size;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); // end of central directory
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directorySize, true);
  endView.setUint32(16, offset, true);

  return new Blob([...parts, ...directory, end], { type: "application/zip" });
}
