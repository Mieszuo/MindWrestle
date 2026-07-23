import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/messages";
import { pl } from "@/lib/i18n/messages/pl";
import { en } from "@/lib/i18n/messages/en";

describe("getDictionary", () => {
  it("returns pl for pl", () => expect(getDictionary("pl")).toBe(pl));
  it("returns en for en", () => expect(getDictionary("en")).toBe(en));
});
