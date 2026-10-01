"use client";
import { track } from "@/lib/analytics/client";
import { useEffect, useState } from "react";
import { createOrder, getPayConfig, mockPay, openRazorpay, restorePurchase, storeUnlock, verifyPayment, type OrderResp, type PayConfig, type UnlockResp } from "@/lib/pay-client";
import { PRICES, rupees } from "@/lib/pricing";

/** Buy / restore box for the ₹29 Exam Kit. Mirrors BiodataKaro's flow (Razorpay Standard Checkout or labelled mock). */
export function Paywall({ unlock }: { unlock: UnlockResp | null }) {
  const [cfg, setCfg] = useState<PayConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [mockOrder, setMockOrder] = useState<OrderResp | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pid, setPid] = useState("");

  useEffect(() => {
    getPayConfig().then(setCfg).catch(() => setCfg(null));
  }, []);

  const price = rupees(PRICES.kit.amountPaise);
  if (unlock) {
    return (
      <p className="rounded-xl bg-emerald-50 p-3 text-[14px] font-semibold text-emerald-900" data-testid="paid-msg">
        ✓ Exam Kit unlocked (payment {unlock.paymentId}) — valid till {new Date(unlock.exp * 1000).toLocaleDateString("en-IN")}.
      </p>
    );
  }

  const buy = async () => {
    setErr("");
    setBusy(true);
    track("checkout_open", { sku: "kit" });
    try {
      const o = await createOrder("kit");
      if (o.provider === "mock") {
        setMockOrder(o);
        return;
      }
      const u = await openRazorpay(o, { description: "Exam Kit – batch ZIP + print sheets" });
      storeUnlock(u);
    } catch (e) {
      if ((e as Error).message !== "cancelled") setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const completeMock = async () => {
    if (!mockOrder) return;
    setBusy(true);
    try {
      const r = await mockPay(mockOrder.orderId);
      const u = await verifyPayment(mockOrder, r);
      storeUnlock(u);
      setMockOrder(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setErr("");
    setBusy(true);
    try {
      storeUnlock(await restorePurchase(pid.trim()));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const available = cfg?.available;
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4" data-testid="paywall">
      {cfg?.provider === "mock" && available && (
        <p className="mb-2 rounded-lg bg-yellow-200 px-3 py-1.5 text-[12px] font-bold text-yellow-900" data-testid="mock-banner">
          TEST MODE — payments are simulated (ALLOW_MOCK_PAYMENTS). No money moves.
        </p>
      )}
      <p className="text-[15px] font-bold text-slate-900">Exam Kit · {price} one-time</p>
      <ul className="mt-1 list-disc pl-5 text-[13px] text-slate-700">
        {PRICES.kit.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {cfg && !available ? (
        <p className="mt-3 rounded-lg bg-white p-3 text-[14px] font-semibold text-slate-700" data-testid="launching-soon">
          Payments are launching soon. All single-file downloads remain free.
        </p>
      ) : (
        <button type="button" disabled={busy || !cfg} onClick={buy} data-testid="buy-kit" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-500 px-5 text-[16px] font-extrabold text-slate-900 shadow hover:bg-amber-400 disabled:opacity-60">
          {busy ? "Please wait…" : `Unlock for ${price} (UPI / card)`}
        </button>
      )}
      {available && (
        <div className="mt-2 text-[13px]">
          {!restoreOpen ? (
            <button type="button" className="text-brand underline" onClick={() => setRestoreOpen(true)} data-testid="restore-open">
              Already paid? Restore purchase
            </button>
          ) : (
            <div className="flex gap-2">
              <input className="inp" placeholder="pay_XXXXXXXX" value={pid} onChange={(e) => setPid(e.target.value)} data-testid="restore-input" />
              <button type="button" className="btn-sec" onClick={restore} disabled={busy} data-testid="restore-submit">
                Restore
              </button>
            </div>
          )}
        </div>
      )}
      {err && <p className="mt-2 text-[13px] text-red-700">{err}</p>}

      {mockOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal data-testid="mock-checkout">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-[12px] font-bold uppercase tracking-wider text-yellow-700">Simulated checkout (test mode)</p>
            <p className="mt-1 text-[20px] font-extrabold">Pay {rupees(mockOrder.amountPaise)}</p>
            <p className="text-[13px] text-slate-600">Order {mockOrder.orderId}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="btn-sec" onClick={() => setMockOrder(null)}>
                Cancel
              </button>
              <button type="button" className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white" onClick={completeMock} data-testid="mock-pay-success">
                Pay (test)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
