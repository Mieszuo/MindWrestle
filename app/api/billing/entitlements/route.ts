import { NextResponse } from "next/server";

import { emptyAttemptEntitlements, getAttemptEntitlements } from "@/lib/billing/attempts.server";
import { getServerLocale } from "@/lib/i18n/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  try {
    const entitlements = await getAttemptEntitlements(auth.supabase, auth.user.id);
    return NextResponse.json({ entitlements });
  } catch (error) {
    console.error("Failed to load attempt entitlements:", error instanceof Error ? error.message : error);
    const locale = await getServerLocale();
    return NextResponse.json({ entitlements: emptyAttemptEntitlements(locale), warning: "BILLING_UNAVAILABLE" });
  }
}
