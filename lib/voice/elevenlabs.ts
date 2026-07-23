import type { VoiceDelivery } from "@/lib/game/voice-delivery";
import type { VoiceProfile } from "@/lib/game/voice-profiles";
import { localeElevenLabsCode, type Locale } from "@/lib/i18n/locale";
import { stripAudioTags } from "@/lib/voice/speech-plan";

interface ElevenLabsAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface SpeechSynthesisResult {
  audio: ArrayBuffer;
  alignment: ElevenLabsAlignment;
  modelId: string;
  fallbackUsed: boolean;
}

class ElevenLabsTtsError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ElevenLabsTtsError";
  }
}

async function requestSpeech(
  profile: VoiceProfile,
  delivery: VoiceDelivery,
  text: string,
  modelId: string,
  locale: Locale,
): Promise<{ audio: ArrayBuffer; alignment: ElevenLabsAlignment }> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error("ElevenLabs is not configured");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${profile.voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      language_code: localeElevenLabsCode(locale),
      voice_settings: {
        stability: delivery.stability,
        similarity_boost: delivery.similarityBoost,
        style: delivery.style,
        speed: delivery.speed,
        use_speaker_boost: true,
      },
    }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ElevenLabsTtsError(
      response.status,
      `ElevenLabs TTS failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const payload = await response.json() as {
    audio_base64?: string;
    alignment?: ElevenLabsAlignment;
    normalized_alignment?: ElevenLabsAlignment;
  };
  const alignment = payload.normalized_alignment ?? payload.alignment;
  if (!payload.audio_base64 || !alignment?.characters?.length) {
    throw new ElevenLabsTtsError(422, "ElevenLabs TTS returned audio without alignment");
  }
  const bytes = Buffer.from(payload.audio_base64, "base64");
  const audio = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  if (audio.byteLength < 128) {
    throw new ElevenLabsTtsError(422, "ElevenLabs TTS returned invalid audio");
  }
  return { audio, alignment };
}

export async function synthesizeSpeech(
  profile: VoiceProfile,
  delivery: VoiceDelivery,
  spokenText: string,
  displayText: string,
  locale: Locale,
): Promise<SpeechSynthesisResult> {
  try {
    const generated = await requestSpeech(profile, delivery, spokenText, profile.modelId, locale);
    return {
      ...generated,
      modelId: profile.modelId,
      fallbackUsed: false,
    };
  } catch (error) {
    const canFallback =
      profile.modelId === "eleven_v3"
      && error instanceof ElevenLabsTtsError
      && (error.status === 400 || error.status === 422);
    if (!canFallback) throw error;

    const fallbackText = stripAudioTags(displayText);
    const generated = await requestSpeech(profile, delivery, fallbackText, "eleven_multilingual_v2", locale);
    return {
      ...generated,
      modelId: "eleven_multilingual_v2",
      fallbackUsed: true,
    };
  }
}
