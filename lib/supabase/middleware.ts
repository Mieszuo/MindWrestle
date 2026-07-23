import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { detectRequestLocale, localeCookieOptions, LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/i18n/locale";
import type { Database } from "@/lib/supabase/database.types";

const authRequired = process.env.AUTH_REQUIRED !== "false";

function withLocaleCookie(request: NextRequest, response: NextResponse) {
  if (!normalizeLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value)) {
    response.cookies.set(LOCALE_COOKIE_NAME, detectRequestLocale(request.headers), localeCookieOptions());
  }
  return response;
}

export async function updateSession(request: NextRequest) {
  if (!authRequired) {
    return withLocaleCookie(request, NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/levels") ||
    pathname.startsWith("/intro") ||
    pathname.startsWith("/level/") ||
    pathname.startsWith("/attempt/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/game/");

  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/");

  if (!user && isProtected && !isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return withLocaleCookie(request, NextResponse.redirect(redirectUrl));
  }

  if (user && pathname === "/login") {
    const next = request.nextUrl.searchParams.get("next") ?? "/levels";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = next;
    redirectUrl.search = "";
    return withLocaleCookie(request, NextResponse.redirect(redirectUrl));
  }

  return withLocaleCookie(request, supabaseResponse);
}
