import { describe, expect, it } from "vitest";
import { pl } from "@/lib/i18n/messages/pl";
import { en } from "@/lib/i18n/messages/en";

function collectKeyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    collectKeyPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("message catalog parity", () => {
  it("pl and en have identical key paths", () => {
    const plKeys = collectKeyPaths(pl).sort();
    const enKeys = collectKeyPaths(en).sort();
    const missingInEn = plKeys.filter((k) => !enKeys.includes(k));
    const extraInEn = enKeys.filter((k) => !plKeys.includes(k));
    expect({ missingInEn, extraInEn }).toEqual({ missingInEn: [], extraInEn: [] });
  });
});
