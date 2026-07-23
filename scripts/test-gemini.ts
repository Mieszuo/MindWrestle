import fs from "fs";
import path from "path";
import { callGemini, geminiModel } from "@/lib/ai/gemini";

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
  const apiKey = process.env.GEMINI_API_KEY;
  const model = geminiModel();

  console.log("Checking Gemini API key...");
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not defined in .env.local!");
    return;
  }
  console.log("GEMINI_API_KEY is present:", apiKey.slice(0, 8) + "...");
  console.log("Using model:", model);

  try {
    const content = await callGemini({
      model,
      temperature: 0.7,
      jsonMode: false,
      messages: [
        { role: "system", content: "You are a friendly narrator. Say hello in 3 words." },
        { role: "user", content: "Go!" }
      ]
    });

    console.log("Response from Gemini:", content);
  } catch (error) {
    console.error("Failed to run Gemini test call:", error);
  }
}

test();
