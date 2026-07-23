import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchPlayerLoreState, markLoreBeatSeen } from "@/lib/game/lore/persistence";
import { requireAuth } from "@/lib/supabase/api-auth";
import { validateBody } from "@/lib/validation";

const chroniclePatchSchema = z.object({
  fragmentId: z.string().min(1, "fragmentId is required"),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  try {
    const loreState = await fetchPlayerLoreState(auth.supabase, auth.user.id);
    return NextResponse.json({ loreState });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load Chronicle" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const body = validateBody(await request.json().catch(() => null), chroniclePatchSchema);
  if (body instanceof NextResponse) return body;

  try {
    const loreState = await markLoreBeatSeen(auth.supabase, auth.user.id, body.fragmentId);
    return NextResponse.json({ loreState });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update Chronicle" },
      { status: 500 },
    );
  }
}
