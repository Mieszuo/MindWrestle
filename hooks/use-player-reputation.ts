"use client";

import { useCallback, useEffect, useState } from "react";

import { defaultReputation, parseReputation, type PlayerReputation } from "@/lib/game/reputation";
import { createClient } from "@/lib/supabase/client";

export function usePlayerReputation() {
  const [reputation, setReputation] = useState<PlayerReputation>(defaultReputation());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setReputation(defaultReputation());
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from("profiles").select("reputation").eq("id", user.id).maybeSingle();
    if (error) {
      setReputation(defaultReputation());
    } else {
      setReputation(parseReputation(data?.reputation));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  return { reputation, loading, refresh };
}
