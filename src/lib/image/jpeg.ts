/**
 * Byte-level JPEG helpers (no dependencies, works in browser and Node):
 *  - read pixel size from the SOF marker
 *  - read / write JFIF density (DPI)
 *  - read EXIF orientation
 *  - pad a file with COM (comment) segments to reach a minimum byte size without touching pixels
 */

export function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1];
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) {
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    }
    if (m === 0xda) return null;
    i += 2 + len;
  }
  return null;
}

export function jfifDensity(b: Uint8Array): { units: number; x: number; y: number } | null {
  if (b[2] === 0xff && b[3] === 0xe0 && b[6] === 0x4a && b[7] === 0x46 && b[8] === 0x49 && b[9] === 0x46 && b[10] === 0) {
    return { units: b[13], x: (b[14] << 8) | b[15], y: (b[16] << 8) | b[17] };
  }
  return null;
}

function jfifSegment(dpi: number) {
  const s = new Uint8Array(18);
  s.set([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, dpi >> 8, dpi & 0xff, dpi >> 8, dpi & 0xff, 0x00, 0x00]);
  return s;
}

/** Returns a copy with a JFIF APP0 segment that declares `dpi` (dots per inch). */
export function setJpegDpi(b: Uint8Array, dpi: number): Uint8Array {
  dpi = Math.max(1, Math.min(65535, Math.round(dpi)));
  if (jfifDensity(b)) {
    const out = b.slice();
    out[13] = 1;
    out[14] = dpi >> 8;
    out[15] = dpi & 0xff;
    out[16] = dpi >> 8;
    out[17] = dpi & 0xff;
    return out;
  }
  const seg = jfifSegment(dpi);
  const out = new Uint8Array(b.length + seg.length);
  out.set(b.subarray(0, 2), 0);
  out.set(seg, 2);
  out.set(b.subarray(2), 2 + seg.length);
  return out;
}

/** Insert COM segments after the header so the file is exactly `targetBytes` long (pixels unchanged). */
export function padJpeg(b: Uint8Array, targetBytes: number): Uint8Array {
  let need = targetBytes - b.length;
  if (need <= 0) return b;
  const insertAt = jfifDensity(b) ? 2 + 2 + ((b[4] << 8) | b[5]) : 2;
  const chunks: Uint8Array[] = [];
  while (need > 0) {
    // a COM segment costs 4 bytes of header; minimum useful segment is 5 bytes total
    let total = Math.min(need, 65535 + 2);
    if (need - total > 0 && need - total < 5) total -= 5; // avoid leaving an unfillable remainder
    if (total < 5) total = 5;
    const dataLen = total - 4;
    const seg = new Uint8Array(total);
    seg[0] = 0xff;
    seg[1] = 0xfe;
    seg[2] = ((dataLen + 2) >> 8) & 0xff;
    seg[3] = (dataLen + 2) & 0xff;
    seg.fill(0x20, 4); // spaces
    chunks.push(seg);
    need -= total;
  }
  const extra = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(b.length + extra);
  out.set(b.subarray(0, insertAt), 0);
  let o = insertAt;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  out.set(b.subarray(insertAt), o);
  return out;
}

/** EXIF orientation (1–8) of a JPEG, or 1 when absent. */
export function exifOrientation(b: Uint8Array): number {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return 1;
    const m = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (m === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const t = i + 10; // TIFF header
      const le = b[t] === 0x49;
      const u16 = (p: number) => (le ? b[p] | (b[p + 1] << 8) : (b[p] << 8) | b[p + 1]);
      const u32 = (p: number) => (le ? (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16)) + b[p + 3] * 0x1000000 : b[p] * 0x1000000 + ((b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]));
      const ifd = t + u32(t + 4);
      const n = u16(ifd);
      for (let k = 0; k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (u16(e) === 0x0112) {
          const v = u16(e + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    if (m === 0xda) return 1;
    i += 2 + len;
  }
  return 1;
}
