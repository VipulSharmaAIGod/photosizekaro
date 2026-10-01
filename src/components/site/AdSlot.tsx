/**
 * Reserved ad placement. Intentionally renders NOTHING today — no ad code ships.
 * To enable AdSense later: set NEXT_PUBLIC_ADSENSE_CLIENT, add the AdSense <Script> in app/(site)/layout.tsx,
 * render <ins className="adsbygoogle" data-ad-client=... data-ad-slot={id} /> here, and keep the fixed min-height
 * to avoid layout shift (CLS). Never place ads inside the resizer controls or next to download/payment buttons
 * (accidental clicks violate AdSense policy). Update the Privacy Policy (cookies/consent) at the same time.
 */
export function AdSlot({ id, minHeight = 120 }: { id: string; minHeight?: number }) {
  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT) return null;
  return <div data-ad-slot={id} aria-hidden className="mx-auto my-8 max-w-3xl" style={{ minHeight }} />;
}
