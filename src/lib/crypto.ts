import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacHex(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("hex");
}
export function hmacB64url(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}
export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

let warned = false;
/** Secret used to sign unlock tokens and order tickets. */
export function signingSecret(): string {
  const s = process.env.UNLOCK_TOKEN_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (s) return s;
  if (!warned) {
    console.warn("[unlock] UNLOCK_TOKEN_SECRET not set — using an insecure development secret. Set it before going live.");
    warned = true;
  }
  return "dev-insecure-unlock-secret-change-me";
}

/** Compact signed blob: base64url(json).sig */
export function signBlob(payload: object, purpose: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmacB64url(signingSecret(), `${purpose}.${body}`)}`;
}
export function readBlob<T>(blob: string, purpose: string): T | null {
  if (typeof blob !== "string" || blob.length > 2000) return null;
  const [body, sig] = blob.split(".");
  if (!body || !sig) return null;
  if (!safeEqual(sig, hmacB64url(signingSecret(), `${purpose}.${body}`))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
