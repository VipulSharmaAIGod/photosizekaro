"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackPageview } from "@/lib/analytics/client";

const SKIP = [/^\/preview/, /^\/api\//];

/** Sends one pageview per client-side route change. Waits out speculative prerendering. */
export function Analytics() {
  const path = usePathname();
  useEffect(() => {
    if (!path || SKIP.some((r) => r.test(path))) return;
    const doc = document as Document & { prerendering?: boolean };
    if (doc.prerendering) {
      const fire = () => trackPageview(path);
      document.addEventListener("prerenderingchange", fire, { once: true });
      return () => document.removeEventListener("prerenderingchange", fire);
    }
    trackPageview(path);
  }, [path]);
  return null;
}
