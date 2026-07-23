import { notFound, redirect } from "next/navigation";

import { LevelConversationView } from "@/components/game/level-conversation-view";
import { GameShell } from "@/components/game/game-shell";
import { canAccessLevel } from "@/lib/game/progress";
import { getLevelSceneImage, getLevelSceneMusicTrack } from "@/lib/game/level-scenes";
import { levelsFromApiRows } from "@/lib/game/levels-client";
import { getServerLocale } from "@/lib/i18n/server";
import { fetchPlayerProgress } from "@/lib/supabase/progress.server";
import { createClient } from "@/lib/supabase/server";

interface LevelPageProps {
  params: Promise<{ id: string }>;
}

export default async function LevelPage({ params }: LevelPageProps) {
  const { id } = await params;
  const levelId = Number(id);
  const [progress, locale, supabase] = await Promise.all([
    fetchPlayerProgress(),
    getServerLocale(),
    createClient(),
  ]);
  // Localized level content (character name/archetype/personality + objective)
  // comes from the DB rows via the i18n overlay, not the Polish mock-levels source.
  const { data: rows } = await supabase
    .from("game_levels")
    .select("*")
    .eq("is_active", true)
    .order("order_index", { ascending: true });
  const levels = levelsFromApiRows(rows ?? [], progress, locale);
  const level = levels.find((entry) => entry.id === levelId);

  if (!level) {
    notFound();
  }

  if (!canAccessLevel(levelId, progress)) {
    redirect("/levels");
  }

  const sceneSrc = getLevelSceneImage(levelId);
  const musicTrack = getLevelSceneMusicTrack(levelId);

  return (
    <GameShell variant="level">
      <LevelConversationView
        key={levelId}
        sceneSrc={sceneSrc}
        musicTrack={musicTrack}
        levelId={level.id}
        character={level.character}
        objective={level.objective}
        totalLevels={levels.length}
      />
    </GameShell>
  );
}
