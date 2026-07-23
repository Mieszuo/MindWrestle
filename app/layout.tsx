import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, EB_Garamond, Geist_Mono } from "next/font/google";
import { AudioProvider } from "@/components/audio/audio-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getDictionary } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "latin-ext"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getServerLocale());
  return { title: "MindWrestle", description: t.common.appDescription };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      className={`${ebGaramond.variable} ${cinzel.variable} ${cinzelDecorative.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#140c07]">
        <LocaleProvider locale={locale}>
          <AudioProvider>{children}</AudioProvider>
        </LocaleProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var timerMap = new WeakMap();
                window.addEventListener('scroll', function(e) {
                  var target = e.target;
                  if (!target) return;

                  var elementToClass = target;
                  if (target === document || target === document.documentElement || target === document.body) {
                    elementToClass = document.documentElement;
                  }

                  if (elementToClass.classList) {
                    elementToClass.classList.add('is-scrolling');

                    var oldTimer = timerMap.get(elementToClass);
                    if (oldTimer) clearTimeout(oldTimer);

                    var newTimer = setTimeout(function() {
                      elementToClass.classList.remove('is-scrolling');
                      timerMap.delete(elementToClass);
                    }, 1000);

                    timerMap.set(elementToClass, newTimer);
                  }
                }, { capture: true, passive: true });
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
