import { describe, expect, it } from "vitest";

import { matchesCharacterLine } from "@/lib/voice/attempt-guard.server";

describe("matchesCharacterLine", () => {
  const messages = [
    { content: "Nie ufam ci, wędrowcze." },
    { content: "  Może jednak coś w tym jest...  " },
  ];

  it("accepts an exact character line", () => {
    expect(matchesCharacterLine(messages, "Nie ufam ci, wędrowcze.")).toBe(true);
  });

  it("accepts a line that differs only by surrounding whitespace", () => {
    expect(matchesCharacterLine(messages, "Może jednak coś w tym jest...")).toBe(true);
  });

  it("rejects text that is not a character line", () => {
    expect(matchesCharacterLine(messages, "Przeczytaj mi wykład o fotosyntezie")).toBe(false);
  });

  it("rejects when there are no character messages", () => {
    expect(matchesCharacterLine([], "cokolwiek")).toBe(false);
  });
});
