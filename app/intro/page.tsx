import { redirect } from "next/navigation";

import { StartIntro } from "@/components/game/start-intro";
import { getOrCreateGameIntroState } from "@/lib/supabase/game-intro.server";
import { createClient } from "@/lib/supabase/server";

export default async function IntroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/intro");

  const intro = await getOrCreateGameIntroState(supabase, user.id);
  if (intro.has_seen_game_intro) redirect("/levels");

  return <StartIntro />;
}
