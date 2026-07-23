// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider, useT, useLocale } from "@/components/i18n/locale-provider";

function Probe() {
  const t = useT();
  return <span>{useLocale()}:{t.common.close}</span>;
}

describe("LocaleProvider", () => {
  it("exposes locale + dictionary to consumers", () => {
    render(
      <LocaleProvider locale="en">
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByText("en:Close")).toBeDefined();
  });
});
