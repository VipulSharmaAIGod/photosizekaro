import { ImageResponse } from "next/og";

export const alt = "PhotoSizeKaro – Exam Photo & Signature Resizer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #1546a0 0%, #0b2a66 100%)", color: "#fff", padding: 70, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <div style={{ fontSize: 34, color: "#f59e0b", fontWeight: 700 }}>PhotoSizeKaro</div>
          <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, marginTop: 18 }}>Exam Photo &amp; Signature Resizer</div>
          <div style={{ fontSize: 32, marginTop: 24, opacity: 0.9 }}>SSC · UPSC · IBPS · SBI · RRB · NEET · JEE · CUET · GATE · CTET</div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 30, background: "#f59e0b", color: "#1b1b1b", padding: "14px 30px", borderRadius: 16, alignSelf: "flex-start", fontWeight: 800 }}>
            Exact pixels · Exact KB · Free
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 300 }}>
          <div style={{ width: 230, height: 296, background: "#fff", borderRadius: 10, border: "8px solid #f59e0b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
            <div style={{ width: 96, height: 110, borderRadius: 60, background: "#cbd5e1", marginBottom: 10 }} />
            <div style={{ width: 190, height: 90, borderRadius: "90px 90px 0 0", background: "#94a3b8" }} />
          </div>
          <div style={{ marginTop: 14, fontSize: 26, fontWeight: 700 }}>200 × 230 px · 20–50 KB</div>
        </div>
      </div>
    ),
    size,
  );
}
