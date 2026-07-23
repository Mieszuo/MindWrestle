import { NextResponse } from "next/server";
import { z } from "zod";

import { detectRequestLocale, localeCookieOptions, LOCALE_COOKIE_NAME, LOCALES, mergeLocaleIntoSettings, parseProfileSettings } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";
import { requireAuth } from "@/lib/supabase/api-auth";
import type { Json } from "@/lib/supabase/database.types";
import { validateBody } from "@/lib/validation";

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const v = getDictionary(detectRequestLocale(request.headers)).content.profileValidation;
  const profileSchema = z.object({
    displayName: z.string().trim().min(2, v.nickTooShort).max(24, v.nickTooLong).optional(),
    locale: z.enum(LOCALES).optional(),
  }).refine((body) => body.displayName !== undefined || body.locale !== undefined, {
    message: v.nothingToSave,
  });

  const body = validateBody(await request.json().catch(() => null), profileSchema);
  if (body instanceof NextResponse) return body;

  try {
    const now = new Date().toISOString();
    const { data: current, error: currentError } = await auth.supabase
      .from("profiles")
      .select("display_name, settings")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (currentError) throw new Error(currentError.message);

    const settings = body.locale
      ? mergeLocaleIntoSettings(current?.settings, body.locale)
      : parseProfileSettings(current?.settings);
    const displayName = body.displayName ?? current?.display_name ?? null;

    const { data, error } = await auth.supabase
      .from("profiles")
      .upsert({ id: auth.user.id, display_name: displayName, settings: settings as Json, updated_at: now }, { onConflict: "id" })
      .select("display_name, settings, updated_at")
      .single();

    if (error) throw new Error(error.message);
    const response = NextResponse.json({
      profile: {
        displayName: data.display_name,
        settings: parseProfileSettings(data.settings),
        updatedAt: data.updated_at,
      },
    });
    if (body.locale) response.cookies.set(LOCALE_COOKIE_NAME, body.locale, localeCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 },
    );
  }
}
