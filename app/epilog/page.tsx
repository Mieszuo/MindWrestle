import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EndingSlidesWrapper } from "./ending-slides-wrapper";

import { fetchPlayerLoreState } from "@/lib/game/lore/persistence";
import { getDictionary } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export default async function EpilogPage() {
  const t = getDictionary(await getServerLocale());
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, reputation")
    .eq("id", user.id)
    .single();

  const loreState = await fetchPlayerLoreState(supabase, user.id);

  const reputationParsed = typeof profile?.reputation === "object" && profile?.reputation ? profile.reputation as any : {};

  const reputation = {
    traits: {
      pressure: reputationParsed.traits?.pressure || 0,
      empathy: reputationParsed.traits?.warmth || 0,
      logic: reputationParsed.traits?.logic || 0
    },
    renown: reputationParsed.renown || 0,
    lastIncident: reputationParsed.lastIncident || null,
    lastPraise: reputationParsed.lastPraise || null
  } as any;

  return (
    <EndingSlidesWrapper
      loreState={loreState}
      reputation={reputation}
      displayName={profile?.display_name || t.chronicle.epilogue.defaultDisplayName}
    />
  );
}
