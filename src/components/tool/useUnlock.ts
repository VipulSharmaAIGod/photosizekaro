"use client";
import { useEffect, useState } from "react";
import { checkUnlock, storedUnlock, storeUnlock, type UnlockResp } from "@/lib/pay-client";

/** Kit unlock stored in localStorage, re-validated with the server once per page load. */
export function useUnlock() {
  const [unlock, setUnlock] = useState<UnlockResp | null>(null);
  useEffect(() => {
    const read = () => setUnlock(storedUnlock());
    read();
    const u = storedUnlock();
    if (u) {
      checkUnlock(u.token)
        .then((r) => {
          if (!r.valid) storeUnlock(null);
        })
        .catch(() => {});
    }
    window.addEventListener("psk-unlock", read);
    return () => window.removeEventListener("psk-unlock", read);
  }, []);
  return unlock;
}
