import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

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

  console.log("Fetching latest 5 AI usage events...");
  const { data, error } = await supabase
    .from("ai_usage_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error:", error);
    return;
  }

  for (const event of data || []) {
    console.log(`- Time: ${event.created_at} | Type: ${event.call_type} | Model: ${event.model} | Provider: ${event.provider} | Latency: ${event.latency_ms}ms | Success: ${event.success}`);
  }
}

test();
