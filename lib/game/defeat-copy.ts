import type { DefeatReason } from "@/lib/game/defeat";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

export interface DefeatCopy {
  title: string;
  quote: string;
  hint: string;
  sealVariant:
    | "patience"
    | "suspicion"
    | "interest"
    | "caution"
    | "respect"
    | "irritation"
    | "curiosity"
    | "ego"
    | "distance"
    | "attention"
    | "default";
}

const redLineSealVariants: Record<string, DefeatCopy["sealVariant"]> = {
  forced_demand: "suspicion",
  desperate_bargain: "interest",
  honor_wound: "respect",
  coward_accusation: "irritation",
  rushed_arrogance: "curiosity",
  ego_insult: "ego",
  dominance_play: "distance",
};

const levelDefaultSealVariants: Record<number, DefeatCopy["sealVariant"]> = {
  1: "patience",
  2: "interest",
  3: "respect",
  4: "irritation",
  5: "curiosity",
  6: "ego",
  7: "distance",
};

export function getDefeatCopy(levelId: number, reason: DefeatReason, locale: Locale): DefeatCopy {
  const content = getDictionary(locale).content.defeat;

  if (reason.reactionTag && reason.reactionTag in content.redLines) {
    const redLine = content.redLines[reason.reactionTag as keyof typeof content.redLines];
    return {
      title: redLine.title,
      quote: redLine.quote,
      hint: redLine.hint,
      sealVariant: redLineSealVariants[reason.reactionTag] ?? "default",
    };
  }

  const levelKey = String(levelId) as keyof typeof content.levelDefaults;
  const defaults = content.levelDefaults[levelKey] ?? content.genericDefault;
  const sealVariant = levelDefaultSealVariants[levelId] ?? "default";
  const overridesForLevel = content.levelOverrides[levelKey as keyof typeof content.levelOverrides] as
    | Partial<Record<string, { title: string; quote: string }>>
    | undefined;
  const override = overridesForLevel?.[reason.emotion];

  return {
    title: override?.title ?? defaults.title,
    quote: override?.quote ?? defaults.quote,
    hint: content.emotionHints[reason.emotion as keyof typeof content.emotionHints] ?? content.fallbackHint,
    sealVariant,
  };
}
