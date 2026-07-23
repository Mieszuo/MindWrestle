import { describe, expect, it } from "vitest";

import { containsExactWord, normalizeText } from "@/lib/game/text-validator";

describe("normalizeText", () => {
  it("folds diacritics and lowercases, dropping quotes", () => {
    expect(normalizeText('„Jabłko”')).toBe("jablko");
    expect(normalizeText("CÓRKA")).toBe("corka");
  });
});

describe("containsExactWord", () => {
  it("matches across diacritics and case", () => {
    expect(containsExactWord("Powiedział corka wyraźnie", "córka")).toBe(true);
    expect(containsExactWord("To jest JABŁKO na stole", "jabłko")).toBe(true);
  });

  it("still requires a whole-word match", () => {
    expect(containsExactWord("myślę o jabłku", "jabłko")).toBe(false);
  });
});
