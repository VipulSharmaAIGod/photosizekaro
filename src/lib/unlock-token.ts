import "server-only";
import { readBlob, signBlob } from "./crypto";
import { UNLOCK_VALIDITY_DAYS, type Sku } from "./pricing";
import { activeProvider, mockAllowed } from "./payments";

/** Stateless unlock token — no database. */
export interface UnlockPayload {
  v: 1;
  sku: Sku;
  pid: string; // payment id
  mode: "live" | "test" | "mock";
  iat: number;
  exp: number;
}

export function issueUnlockToken(p: { sku: Sku; pid: string; mode: UnlockPayload["mode"] }): { token: string; payload: UnlockPayload } {
  const now = Math.floor(Date.now() / 1000);
  const payload: UnlockPayload = { v: 1, ...p, iat: now, exp: now + UNLOCK_VALIDITY_DAYS * 86400 };
  return { token: signBlob(payload, "unlock"), payload };
}

export function verifyUnlockToken(token: string): UnlockPayload | null {
  const p = readBlob<UnlockPayload>(token, "unlock");
  if (!p || p.v !== 1 || p.sku !== "kit") return null;
  if (p.exp < Date.now() / 1000) return null;
  // Tokens minted by the mock provider never work once a real gateway is configured.
  if (p.mode === "mock" && (activeProvider().mode !== "mock" || !mockAllowed())) return null;
  return p;
}
