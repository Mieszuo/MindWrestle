"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PressableButton } from "@/components/ui/pressable-button";
import { useAudio } from "@/hooks/use-audio";
import { navItems } from "@/lib/landing/content";
import { useT } from "@/components/i18n/locale-provider";

export function LandingHeader() {
  const router = useRouter();
  const audio = useAudio();
  const t = useT();

  function enterGame() {
    audio.unlockAudio();
    router.push("/levels");
  }

  return (
    <header className="landing-header sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-3 text-[var(--cm-parchment-light)]">
          <Image
            src="/logo.png"
            alt="MindWrestle"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
            priority
          />
          <span className="whitespace-nowrap font-heading text-xs font-semibold tracking-[0.06em] sm:text-sm md:text-base">
            MindWrestle
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-[var(--cm-parchment-mid)] transition-colors hover:text-[var(--cm-magic-amber)]"
            >
              {t.landing.header.nav[item.key]}
            </a>
          ))}
        </nav>

        <PressableButton tone="primary" onClick={enterGame} sound="none">
          {t.landing.header.playNow}
        </PressableButton>
      </div>
    </header>
  );
}
