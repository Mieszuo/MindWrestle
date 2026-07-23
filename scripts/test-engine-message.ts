import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { sendAttemptMessage } from "../lib/game/engine.server";

// Load .env.local manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const val = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  }
}

async function test() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing Supabase config");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const attemptId = "2b3d7808-1549-4510-ba07-98774b6cd398";
  console.log("Fetching attempt details...");
  const { data: attempt, error } = await supabase
    .from("conversation_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (error || !attempt) {
    console.error("Failed to fetch attempt:", error || "Not found");
    return;
  }

  console.log("Found attempt. User ID:", attempt.user_id);
  console.log("Running sendAttemptMessage...");
  try {
    const result = await sendAttemptMessage(supabase, attempt.user_id, attemptId, "Dlaczego mi nie pomagasz?");
    console.log("SUCCESS! Result:", result);
  } catch (err) {
    console.error("ERROR running sendAttemptMessage:", err);
  }
}

test();
