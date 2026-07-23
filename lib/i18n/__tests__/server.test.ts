import { afterEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
const headersGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
  headers: async () => ({ get: headersGet }),
}));

import { getServerLocale } from "@/lib/i18n/server";

afterEach(() => {
  cookieGet.mockReset();
  headersGet.mockReset();
});

describe("getServerLocale", () => {
  it("prefers the locale cookie", async () => {
    cookieGet.mockReturnValue({ value: "en" });
    expect(await getServerLocale()).toBe("en");
  });

  it("falls back to request detection when cookie missing", async () => {
    cookieGet.mockReturnValue(undefined);
    headersGet.mockImplementation((name: string) =>
      name === "accept-language" ? "pl-PL,pl;q=0.9" : null,
    );
    expect(await getServerLocale()).toBe("pl");
  });
});
