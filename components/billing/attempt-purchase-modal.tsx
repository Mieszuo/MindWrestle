"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { PressableButton } from "@/components/ui/pressable-button";
import { useT } from "@/components/i18n/locale-provider";

interface AttemptPurchaseModalProps {
  levelId: number;
  onClose: () => void;
  title?: string;
  description?: string;
}

interface EntitlementsPayload {
  entitlements?: {
    paidRemaining: number;
    free: { limit: number; used: number; remaining: number };
    unavailable?: boolean;
  };
  warning?: string;
  error?: string;
}

// Attempt-wallet status modal. Shows how many free (monthly) and granted
// attempts remain; free attempts renew at the start of each month.
export function AttemptPurchaseModal({
  onClose,
  title,
  description,
}: AttemptPurchaseModalProps) {
  const t = useT();
  const resolvedTitle = title ?? t.billing.purchaseModal.defaultTitle;
  const resolvedDescription = description ?? t.billing.purchaseModal.defaultDescription;
  const [payload, setPayload] = useState<EntitlementsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onClose]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/billing/entitlements", { cache: "no-store" })
      .then((response) => response.json())
      .then((nextPayload: EntitlementsPayload) => {
        if (!cancelled) {
          setPayload(nextPayload);
          if (nextPayload.warning === "BILLING_UNAVAILABLE" || nextPayload.entitlements?.unavailable) {
            setError(t.billing.purchaseModal.unavailableError);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError(t.billing.purchaseModal.fetchError);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const entitlements = payload?.entitlements;

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/65 px-4 pointer-events-auto"
      style={{ backdropFilter: "blur(14px) saturate(0.92)", WebkitBackdropFilter: "blur(14px) saturate(0.92)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="attempt-shop-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-transparent"
        onClick={onClose}
        aria-label={t.billing.purchaseModal.closeAriaLabel}
      />
      <section className="relative grid w-full max-w-xl grid-rows-[auto_auto_auto_1fr] rounded-[2rem] border border-amber-200/40 bg-[#21150d]/95 p-6 text-amber-50 shadow-[0_30px_90px_rgba(0,0,0,0.55)] pointer-events-auto">
        <PressableButton tone="icon" className="absolute right-4 top-4 cursor-pointer" onClick={onClose} aria-label={t.billing.purchaseModal.closeAriaLabel}>
          <X aria-hidden />
        </PressableButton>

        <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-300/80">{t.billing.purchaseModal.kicker}</p>
        <h2 id="attempt-shop-title" className="mt-2 text-3xl font-black tracking-tight text-amber-50">{resolvedTitle}</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-amber-100/80">
          {resolvedDescription}
        </p>

        <div className="mt-5 grid min-h-[4.5rem] grid-cols-[1fr_auto] content-center gap-2 rounded-2xl border border-amber-200/20 bg-black/20 p-4 text-sm">
          <span className="text-amber-100/70">{t.billing.purchaseModal.paidRemainingLabel}</span>
          <strong className="text-amber-50">{entitlements ? entitlements.paidRemaining : t.billing.purchaseModal.loadingValue}</strong>
          <span className="text-amber-100/70">{t.billing.purchaseModal.freeThisMonthLabel}</span>
          <strong className="text-amber-50">
            {entitlements ? `${entitlements.free.remaining} / ${entitlements.free.limit}` : t.billing.purchaseModal.loadingValue}
          </strong>
        </div>

        {error && <p className="mt-4 rounded-xl border border-red-300/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">{error}</p>}

        <p className="mt-5 text-center text-sm leading-relaxed text-amber-100/70">
          {t.billing.purchaseModal.renewalNote}
        </p>
      </section>
    </div>,
    document.body,
  );
}
