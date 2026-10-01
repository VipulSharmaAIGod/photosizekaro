import { jpegSize } from "./jpeg";

/**
 * Minimal one-page PDF that places a JPEG (DCTDecode, no re-encoding) to fill the page.
 * pageWmm/pageHmm = physical page size, so printing at "Actual size / 100%" keeps photos at true cm size.
 */
export function jpegToPdf(jpeg: Uint8Array, pageWmm: number, pageHmm: number, title = "Photo sheet"): Uint8Array {
  const size = jpegSize(jpeg);
  if (!size) throw new Error("Not a JPEG");
  const W = ((pageWmm / 25.4) * 72).toFixed(2);
  const H = ((pageHmm / 25.4) * 72).toFixed(2);
  const enc = new TextEncoder();
  const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  const objs: (string | Uint8Array)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`],
    [`<< /Type /XObject /Subtype /Image /Width ${size.width} /Height ${size.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, "\nendstream"],
    [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
    [`<< /Title (${title.replace(/[()\\]/g, "")}) /Producer (PhotoSizeKaro) >>`],
  ];
  const chunks: Uint8Array[] = [];
  let len = 0;
  const push = (x: string | Uint8Array) => {
    const b = typeof x === "string" ? enc.encode(x) : x;
    chunks.push(b);
    len += b.length;
  };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const offsets: number[] = [];
  objs.forEach((parts, i) => {
    offsets.push(len);
    push(`${i + 1} 0 obj\n`);
    parts.forEach(push);
    push("\nendobj\n");
  });
  const xref = len;
  push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((o) => push(`${String(o).padStart(10, "0")} 00000 n \n`));
  push(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
