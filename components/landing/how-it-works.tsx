"use client";

import { Feather, KeyRound, ScanFace } from "lucide-react";

import { howItWorksSteps } from "@/lib/landing/content";
import styles from "@/components/landing/how-it-works.module.css";
import { useT } from "@/components/i18n/locale-provider";

const stepIcons = [ScanFace, Feather, KeyRound] as const;

export function HowItWorks() {
  const t = useT();

  return (
    <section id="jak-to-dziala" className={`landing-section ${styles.section}`}>
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-12 text-center md:mb-16">
          <p className="landing-kicker justify-center">{t.landing.howItWorks.kicker}</p>
          <h2 className="landing-heading mt-3 text-3xl font-bold md:text-5xl">{t.landing.howItWorks.heading}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--cm-parchment-mid)]">
            {t.landing.howItWorks.description}
          </p>
        </div>

        <div className={styles.chapters}>
          {howItWorksSteps.map((step, index) => {
            const Icon = stepIcons[index];

            return (
              <article key={step.number} className={styles.chapter}>
                <div className={styles.mark}>
                  <span aria-hidden>0{step.number}</span>
                  <Icon className="h-5 w-5" strokeWidth={1.4} aria-hidden />
                </div>
                <p className={styles.eyebrow}>{t.landing.howItWorks.chapterLabel(step.number)}</p>
                <h3>{t.landing.howItWorks.steps[step.key].title}</h3>
                <p className={styles.description}>{t.landing.howItWorks.steps[step.key].description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
