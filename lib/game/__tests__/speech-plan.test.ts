import { describe, expect, it } from "vitest";

import {
  alignSpeechCues,
  buildSpeechChunk,
  buildSpeechPlan,
  preservesDisplayWords,
  stripAudioTags,
} from "@/lib/voice/speech-plan";

describe("speech plan", () => {
  it("keeps display text canonical while adding an invisible delivery direction", () => {
    const displayText = "Nie sprzedam ci tego za mniej niż pięćset monet.";
    const chunk = buildSpeechChunk({
      displayText,
      levelId: 2,
      emotions: { interest: 45, caution: 55, bargain: 70 },
      sentenceIndex: 0,
      sentenceCount: 1,
    });

    expect(chunk.displayText).toBe(displayText);
    expect(chunk.spokenText).toBe(`[mischievously] ${displayText}`);
    expect(stripAudioTags(chunk.spokenText)).toBe(displayText);
    expect(preservesDisplayWords(displayText, chunk.spokenText)).toBe(true);
  });

  it("prioritizes a validated AI breakthrough direction", () => {
    const chunk = buildSpeechChunk({
      displayText: "Może jednak pamiętam więcej.",
      levelId: 1,
      emotions: { trust: 80, suspicion: 10, patience: 70 },
      responseMode: "crack_in_armor",
      sentenceIndex: 0,
      sentenceCount: 2,
      voicePerformance: {
        direction: "sincerely",
        pauseAfterSentence: [0],
        subtlety: "pronounced",
        source: "ai",
      },
    });

    expect(chunk.directionSource).toBe("ai");
    expect(chunk.spokenText).toContain("[sincerely]");
    expect(chunk.spokenText).toContain("[long pause]");
  });

  it("keeps an irritated or impatient character controlled instead of shouting", () => {
    const chunk = buildSpeechChunk({
      displayText: "Dość.",
      levelId: 4,
      emotions: { respect: 20, stubbornness: 80, irritation: 75 },
      sentenceIndex: 0,
      sentenceCount: 1,
    });

    expect(chunk.spokenText).toBe("[firmly] Dość.");
    expect(chunk.spokenText).not.toMatch(/shout|angry/iu);
  });

  it("rejects paraphrases even when their meaning is similar", () => {
    const displayText =
      "Nie sprzedam ci tego za mniej niż pięćset monet. Chyba że masz coś więcej niż puste słowa, wędrowcze.";
    const correct =
      "[mischievously] Nie sprzedam ci tego za mniej niż pięćset monet... [short pause] Chyba że masz coś więcej niż puste słowa, wędrowcze.";
    const paraphrase =
      "[mischievously] Nie, wędrowcze... pięćset monet to moja ostatnia cena.";

    expect(preservesDisplayWords(displayText, correct)).toBe(true);
    expect(preservesDisplayWords(displayText, paraphrase)).toBe(false);
  });

  it("never places a pause before the first spoken word", () => {
    const chunk = buildSpeechChunk({
      displayText: "Prawda wraca powoli.",
      levelId: 7,
      emotions: { attention: 45, insight: 80, distance: 70 },
      responseMode: "full_reveal",
      sentenceIndex: 0,
      sentenceCount: 2,
    });

    expect(chunk.spokenText).toMatch(/^\[[^\]]+\] Prawda/u);
    expect(chunk.spokenText).not.toMatch(/^\[(?:short|long) pause\]/u);
  });

  it("does not append an authored pause after the final sentence", () => {
    const chunk = buildSpeechChunk({
      displayText: "Droga pozostaje.",
      levelId: 7,
      emotions: { attention: 80, insight: 90, distance: 40 },
      responseMode: "full_reveal",
      sentenceIndex: 0,
      sentenceCount: 1,
      voicePerformance: {
        direction: "distantly",
        pauseAfterSentence: [0],
        subtlety: "pronounced",
        source: "authored",
      },
    });

    expect(chunk.spokenText).toBe("[distantly] Droga pozostaje.");
  });

  it("does not stack an explicit pause on an existing ellipsis or dash", () => {
    const chunk = buildSpeechChunk({
      displayText: "Nie wiem...",
      levelId: 1,
      emotions: { trust: 45, suspicion: 60, patience: 60 },
      responseMode: "crack_in_armor",
      sentenceIndex: 0,
      sentenceCount: 3,
      voicePerformance: {
        direction: "hesitantly",
        pauseAfterSentence: [0],
        subtlety: "pronounced",
        source: "ai",
      },
    });

    expect(chunk.spokenText).toBe("[hesitantly] Nie wiem...");
  });

  it("uses a character-specific response mode direction", () => {
    const orc = buildSpeechChunk({
      displayText: "Nie naciskaj.",
      levelId: 4,
      emotions: { respect: 20, stubbornness: 80, irritation: 70 },
      responseMode: "full_resistance",
      sentenceIndex: 0,
      sentenceCount: 1,
    });
    const mila = buildSpeechChunk({
      displayText: "Nie chcę o tym mówić.",
      levelId: 1,
      emotions: { trust: 20, suspicion: 80, patience: 60 },
      responseMode: "full_resistance",
      sentenceIndex: 0,
      sentenceCount: 1,
    });

    expect(orc.spokenText.startsWith("[angry but controlled]")).toBe(true);
    expect(mila.spokenText.startsWith("[cautiously]")).toBe(true);
  });

  it("rejects a valid AI tag when it does not fit the character", () => {
    const chunk = buildSpeechChunk({
      displayText: "Może jednak pamiętam.",
      levelId: 1,
      emotions: { trust: 55, suspicion: 45, patience: 60 },
      responseMode: "crack_in_armor",
      sentenceIndex: 0,
      sentenceCount: 1,
      voicePerformance: {
        direction: "angry but controlled",
        pauseAfterSentence: [],
        subtlety: "balanced",
        source: "ai",
      },
    });

    expect(chunk.directionSource).toBe("rules");
    expect(chunk.spokenText).toBe("[hesitantly] Może jednak pamiętam.");
  });

  it("directs a complete reply with one continuous acting context", () => {
    const plan = buildSpeechPlan({
      displayText: "Pierwsze zdanie. Drugie zdanie. Trzecie zdanie.",
      levelId: 3,
      emotions: { respect: 45, pride: 70, patience: 65 },
      responseMode: "crack_in_armor",
    });

    expect(plan.spokenText.match(/\[quietly\]/gu)).toHaveLength(1);
    expect(plan.sentences).toHaveLength(3);
    expect(preservesDisplayWords(plan.displayText, plan.spokenText)).toBe(true);
  });

  it("maps sentence starts from one continuous timestamp alignment", () => {
    const spoken = "[quietly] Pierwsze zdanie. Drugie zdanie.";
    const characters = [...spoken];
    const cues = alignSpeechCues(
      ["Pierwsze zdanie.", "Drugie zdanie."],
      {
        characters,
        character_start_times_seconds: characters.map((_, index) => index * 0.05),
        character_end_times_seconds: characters.map((_, index) => (index + 1) * 0.05),
      },
    );

    expect(cues[0]?.startMs).toBeGreaterThan(0);
    expect(cues[1]!.startMs).toBeGreaterThan(cues[0]!.endMs);
  });
});
