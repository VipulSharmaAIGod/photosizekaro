"use client";
/** Print-ready photo sheets at 300 DPI (true physical size when printed at 100% / "Actual size"). */
export type SheetLayout = "a4-30" | "4x6-8" | "postcard";

export const SHEETS: Record<SheetLayout, { label: string; pageW: number; pageH: number; mmW: number; mmH: number; cols: number; rows: number; cellW: number; cellH: number }> = {
  // 3.5 × 4.5 cm cells = 413 × 531 px at 300 DPI
  "a4-30": { label: "A4 sheet · 30 passport photos (3.5 × 4.5 cm) · PDF", pageW: 2480, pageH: 3508, mmW: 210, mmH: 297, cols: 5, rows: 6, cellW: 413, cellH: 531 },
  "4x6-8": { label: "4 × 6 inch photo paper · 8 passport photos · JPG", pageW: 1800, pageH: 1200, mmW: 152.4, mmH: 101.6, cols: 4, rows: 2, cellW: 413, cellH: 531 },
  postcard: { label: "Postcard 4 × 6 inch (NEET) · 1 photo · JPG", pageW: 1200, pageH: 1800, mmW: 101.6, mmH: 152.4, cols: 1, rows: 1, cellW: 1200, cellH: 1800 },
};

export function drawSheet(photo: HTMLCanvasElement, layout: SheetLayout, watermark: boolean): HTMLCanvasElement {
  const s = SHEETS[layout];
  const c = document.createElement("canvas");
  c.width = s.pageW;
  c.height = s.pageH;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff";
  x.fillRect(0, 0, c.width, c.height);
  const gap = layout === "postcard" ? 0 : 24;
  const gridW = s.cols * s.cellW + (s.cols - 1) * gap;
  const gridH = s.rows * s.cellH + (s.rows - 1) * gap;
  const ox = Math.round((s.pageW - gridW) / 2);
  const oy = Math.round((s.pageH - gridH) / 2);
  x.imageSmoothingQuality = "high";
  for (let r = 0; r < s.rows; r++)
    for (let k = 0; k < s.cols; k++) {
      const px = ox + k * (s.cellW + gap);
      const py = oy + r * (s.cellH + gap);
      x.drawImage(photo, px, py, s.cellW, s.cellH);
      if (layout !== "postcard") {
        x.strokeStyle = "#c8c8c8";
        x.lineWidth = 1;
        x.strokeRect(px - 0.5, py - 0.5, s.cellW + 1, s.cellH + 1);
      }
    }
  if (watermark) {
    x.save();
    x.translate(c.width / 2, c.height / 2);
    x.rotate(-Math.atan2(c.height, c.width));
    x.fillStyle = "rgba(220, 38, 38, 0.35)";
    x.font = `900 ${Math.round(Math.min(c.width, c.height) / 7)}px system-ui, sans-serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("PREVIEW", 0, 0);
    x.restore();
  }
  return c;
}
