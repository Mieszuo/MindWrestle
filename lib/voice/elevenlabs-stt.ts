const DEFAULT_STT_MODEL = "scribe_v2";
const DEFAULT_REALTIME_STT_MODEL = "scribe_v2_realtime";

export function hasElevenLabsSttConfig() {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export function getElevenLabsSttModelId() {
  return process.env.ELEVENLABS_STT_MODEL_ID?.trim() || DEFAULT_STT_MODEL;
}

export function getElevenLabsRealtimeSttModelId() {
  return process.env.ELEVENLABS_STT_REALTIME_MODEL_ID?.trim() || DEFAULT_REALTIME_STT_MODEL;
}

export async function transcribeSpeech(audio: Blob): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error("ElevenLabs STT is not configured");

  const form = new FormData();
  form.append("file", audio, "speech.webm");
  form.append("model_id", getElevenLabsSttModelId());
  form.append("tag_audio_events", "false");
  // language_code omitted — ElevenLabs auto-detects the spoken language.

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs STT failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim() ?? "";
}
