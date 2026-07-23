import { afterEach, describe, expect, it, vi } from "vitest";

import { synthesizeSpeech } from "@/lib/voice/elevenlabs";
import type { VoiceDelivery } from "@/lib/game/voice-delivery";
import type { VoiceProfile } from "@/lib/game/voice-profiles";

const profile: VoiceProfile = {
  levelId: 2,
  label: "Handlarz",
  voiceId: "voice-id",
  modelId: "eleven_v3",
  stability: 0.5,
  similarityBoost: 0.7,
  speed: 1,
  style: 0.4,
  voiceDirection: "mischievously",
};

const delivery: VoiceDelivery = {
  stability: 0.5,
  similarityBoost: 0.7,
  speed: 1,
  style: 0.4,
  moodDanger: "comfortable",
};

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.ELEVENLABS_API_KEY;
});

describe("ElevenLabs TTS fallback", () => {
  it("falls back from v3 to multilingual v2 on voice/model incompatibility and strips tags", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    const displayText = "Nie sprzedam ci tego za mniej niż pięćset monet.";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("incompatible", { status: 422 }))
      .mockResolvedValueOnce(timestampedResponse(displayText));
    globalThis.fetch = fetchMock as any;
    const result = await synthesizeSpeech(
      profile,
      delivery,
      `[mischievously] ${displayText}`,
      displayText,
      "pl",
    );

    expect(result.modelId).toBe("eleven_multilingual_v2");
    expect(result.fallbackUsed).toBe(true);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(firstBody.text).toContain("[mischievously]");
    expect(firstBody.model_id).toBe("eleven_v3");
    expect(firstBody.language_code).toBe("pl");
    expect(secondBody.text).toBe(displayText);
    expect(secondBody.model_id).toBe("eleven_multilingual_v2");
  });

  it.each([401, 402, 429])("does not retry non-compatibility status %s", async (status) => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response("failure", { status }));
    globalThis.fetch = fetchMock as any;

    await expect(synthesizeSpeech(profile, delivery, "[softly] Tekst.", "Tekst.", "pl"))
      .rejects.toThrow(`(${status})`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function timestampedResponse(text: string) {
  const characters = [...text];
  return Response.json({
    audio_base64: Buffer.alloc(256).toString("base64"),
    normalized_alignment: {
      characters,
      character_start_times_seconds: characters.map((_, index) => index * 0.02),
      character_end_times_seconds: characters.map((_, index) => (index + 1) * 0.02),
    },
  });
}
