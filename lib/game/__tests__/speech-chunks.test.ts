import { describe, expect, it } from "vitest";

import { splitSpeechSentences } from "@/lib/voice/speech-chunks";

describe("splitSpeechSentences", () => {
  it("splits dialogue into punctuation-terminated chunks", () => {
    expect(splitSpeechSentences("Pierwsze zdanie. Drugie pytanie? I cisza…")).toEqual([
      "Pierwsze zdanie.",
      "Drugie pytanie?",
      "I cisza…",
    ]);
  });

  it("keeps a punctuation-free response as one chunk", () => {
    expect(splitSpeechSentences("Mów dalej")).toEqual(["Mów dalej"]);
  });
});
