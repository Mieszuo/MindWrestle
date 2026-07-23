import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/supabase/api-auth";

/** Comma-separated admin emails in ADMIN_EMAIL or ADMIN_EMAILS. */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL ?? process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  if (!admins.length) return false;
  return admins.includes(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) {
    return { ...auth, isAdmin: false as const };
  }

  if (!isAdminEmail(auth.user.email)) {
    return {
      ...auth,
      isAdmin: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ...auth, isAdmin: true as const, response: null };
}
