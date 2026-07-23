import { NextResponse } from "next/server";

import { loadAdminAnalytics } from "@/lib/admin/analytics.server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { hasServiceRoleConfig } from "@/lib/supabase/service";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return auth.response!;

  if (!hasServiceRoleConfig()) {
    return NextResponse.json(
      { error: "Brak SUPABASE_SERVICE_ROLE_KEY — analityka wymaga klucza serwisowego." },
      { status: 503 },
    );
  }

  try {
    const data = await loadAdminAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load admin analytics" },
      { status: 500 },
    );
  }
}
