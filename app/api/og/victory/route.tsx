import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { normalizeLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = normalizeLocale(searchParams.get("locale")) ?? "en";
  const t = getDictionary(locale).og;
  const quote = searchParams.get("quote") ?? t.defaultQuote;
  const rank = searchParams.get("rank") ?? "Gold";
  const time = searchParams.get("time") ?? "—";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(180deg, #2a1608 0%, #5c3a22 100%)",
          color: "#f3dfb8",
          padding: "48px",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: "uppercase", opacity: 0.8 }}>
          MindWrestle
        </div>
        <div style={{ marginTop: 24, fontSize: 42, textAlign: "center", maxWidth: "900px", lineHeight: 1.3 }}>
          „{quote.slice(0, 120)}"
        </div>
        <div style={{ marginTop: 32, display: "flex", gap: 32, fontSize: 24 }}>
          <span>{t.rankLabel}: {rank}</span>
          <span>{t.timeLabel}: {time}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
