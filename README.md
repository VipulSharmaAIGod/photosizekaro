# PhotoSizeKaro — Exam Photo & Signature Resizer

Free, mobile-first web app that turns a phone photo/signature into the **exact pixels, KB range, DPI and file name**
required by Indian government exam portals (SSC, UPSC, IBPS, SBI, RRB, NEET, JEE Main, CUET, GATE, CTET, state PSCs).
All image processing runs **in the browser** — no image is ever uploaded (privacy + zero server cost).

Sibling of BiodataKaro (`/workspace/biodata-maker`): same stack (Next.js 16, React 19, TypeScript, Tailwind v4),
same Razorpay provider interface, stateless HMAC unlock tokens, mock-payments gating and Render setup.

## Features
- **31 exam presets** (`src/data/presets.ts`), each with official source links, cycle and `lastVerified` date, and a
  status: `verified` (read in the exam's own current notice), `partial` (shared portal rules or a copy of the notice),
  `unverified` (secondary source / not published → shown with a warning, info-only where no numbers exist).
- Documents: photo, signature, left-thumb impression, hand-written declaration (IBPS/SBI), NEET finger impressions,
  UPSC triple signature, BPSC Hindi/English signatures. Live-captured photos (SSC, RRB, BPSC, RPSC) show guidance, not a resizer.
- Pipeline (`src/lib/image/`): EXIF auto-rotate (with browser auto-orient detection), crop with locked aspect
  (react-easy-crop), rotate, progressive high-quality downscale to exact pixels, background whitening (border
  flood fill + feathering), signature/thumb cleanup (flat-field + threshold → pure white paper, black or original ink),
  auto-fit ink in frame, name & date strip, **binary search on JPEG quality** to land inside the KB window
  (≤ max×1000 B and ≥ min×1024 B, satisfying both KB conventions), JFIF DPI written so cm sizes are correct,
  metadata padding when a tiny image is below the minimum even at top quality (pixels unchanged).
- Custom size mode: px / cm / mm / inch at any DPI, KB min/max.
- Exam Kit (paid, ₹29): upload once → ZIP with files for every selected exam; print sheets (A4 PDF 30 × 3.5×4.5 cm,
  4×6″ 8-up JPG, NEET 4×6″ postcard), all at 300 DPI.
- SEO: landing + one page per preset (`/<exam>-photo-signature-size`) with spec table, steps, sources, Hindi summary,
  FAQ JSON-LD, canonical/OG; Hindi page `/photo-ka-size-kaise-kam-kare`; generic KB pages; sitemap, robots, manifest, OG image.
- Legal: Privacy, Terms, Refund, Shipping/Delivery, Contact, About, Pricing — owner details via `NEXT_PUBLIC_*` env placeholders.
- AdSense: reserved `<AdSlot>` renders nothing (no ad code) until `NEXT_PUBLIC_ADSENSE_CLIENT` is set and code is added.

## Pricing rationale (see `src/lib/pricing.ts`)
Everything needed to apply is free and un-watermarked (that is the SEO product). One optional ₹29 "Exam Kit"
(one-time, 365 days, restorable by payment ID) sells what people pay a cyber café ₹20–50 for: batch files for
many exams + print-ready photo sheets. "No ads" is not sold because no ads run yet.

## Payments
`src/lib/payments` — Razorpay Standard Checkout when `RAZORPAY_KEY_ID/SECRET` exist; otherwise a labelled mock in dev.
With `NODE_ENV=production` the mock is **off** unless `ALLOW_MOCK_PAYMENTS=true` → the paywall shows
"Payments are launching soon" and `/api/payment/order` returns 503. Webhook: `/api/payment/webhook` (`payment.captured`).

## Run locally
```bash
npm ci
npm run build
PORT=3200 bash scripts/restart-server.sh     # prod server in background, log /tmp/psk-server.log
BASE_URL=http://localhost:3200 npm run e2e    # needs ALLOW_MOCK_PAYMENTS=true in .env.local
```
The e2e test (`scripts/e2e.mjs`, playwright-core + system Chrome, 390×844 mobile) generates sample photos/signatures
(incl. EXIF orientation 6 and a shadowed signature), processes them through many presets, downloads the files and
checks exact dimensions, JFIF DPI and byte ranges in Node; tests the Kit ZIP, A4 PDF and 4×6 sheets, mock payment,
restore by payment ID on a fresh browser, token forgery, and that a production server without keys refuses payments.
Outputs go to `test-output/`, screenshots to `screenshots/`.

## Deploy (not done — needs owner action)
1. Buy a domain (e.g. photosizekaro.com / .in — unregistered per RDAP on 1 Oct 2026).
2. Push this repo to GitHub, create a Render Blueprint from `render.yaml` (free plan, Singapore, Node 20.19.2).
3. Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_OWNER_*` contact details; redeploy (baked at build time).
4. Razorpay: KYC/activation with this site (legal pages are ready), then `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET` + webhook URL. Never set `ALLOW_MOCK_PAYMENTS` on Render.
5. Google Search Console: verify domain, submit `/sitemap.xml`. Apply for AdSense once there is traffic.
6. Re-verify presets each notification cycle (`lastVerified` + `sources[].ref` say where to look).
