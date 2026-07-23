import { LevelMap } from "@/components/game/level-map";
import { redirect } from "next/navigation";

import { getOrCreateGameIntroState } from "@/lib/supabase/game-intro.server";
import { createClient } from "@/lib/supabase/server";

export default async function LevelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const intro = await getOrCreateGameIntroState(supabase, user.id);
    if (!intro.has_seen_game_intro) redirect("/intro");
  }

  return <LevelMap />;
}
