import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND} – Exam Photo & Signature Resizer`,
    short_name: BRAND,
    description: "Resize photo and signature to exact pixels and KB for Indian government exam forms. Free, private, in-browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fc",
    theme_color: "#1546a0",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
