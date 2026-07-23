import { getLevelPsychProfile } from "@/lib/game/psychology/level-profiles";
import type { InnerVote, MessageIntent, PsychState } from "@/lib/game/psychology/types";

export interface CouncilContext {
  levelId: number;
  messageIntent: MessageIntent;
  reactionTags: string[];
  hollowFlattery: boolean;
  identityAttack: boolean;
  identityAffirmation: boolean;
  psychState: PsychState;
}

function vote(agentId: string, label: string, stance: number, reason: string): InnerVote {
  return { agent: label, stance: clamp(stance), reason };
}

function clamp(value: number) {
  return Math.min(100, Math.max(-100, Math.round(value)));
}

export function computeCouncilVotes(context: CouncilContext): InnerVote[] {
  const profile = getLevelPsychProfile(context.levelId);
  const { messageIntent, reactionTags, hollowFlattery, identityAttack, identityAffirmation, psychState } = context;
  const pressure = reactionTags.includes("direct_pressure") || messageIntent === "direct_pressure";
  const positive = reactionTags.some((tag) =>
    ["gentle_story", "playful_association", "fair_bargain", "honor_recognition", "shared_duty", "royal_dignity", "kingdom_legacy", "thoughtful_wisdom", "humble_inquiry", "direct_courage"].includes(tag),
  );

  const votes: InnerVote[] = [];

  for (const agent of profile.councilAgents) {
    switch (agent.id) {
      case "fear":
        votes.push(
          vote(agent.id, agent.label, pressure ? 60 : identityAffirmation ? -20 : 30, pressure ? "To brzmi jak nacisk." : "Nie czuję się jeszcze bezpiecznie."),
        );
        break;
      case "curiosity":
        votes.push(
          vote(agent.id, agent.label, messageIntent === "playful_association" || messageIntent === "storytelling" ? 55 : 10, "Może to dobra droga rozmowy."),
        );
        break;
      case "longing":
        votes.push(
          vote(agent.id, agent.label, messageIntent === "storytelling" ? 45 : identityAffirmation ? 20 : 0, "Może można się podzielić wspomnieniem."),
        );
        break;
      case "word_guard":
        votes.push(
          vote(agent.id, agent.label, psychState.axes.secretPressure < 40 ? -80 : -20, "To słowo jest jeszcze za blisko."),
        );
        break;
      case "greed":
        votes.push(vote(agent.id, agent.label, positive ? 35 : -10, "Czy to realna korzyść?"));
        break;
      case "caution":
        votes.push(vote(agent.id, agent.label, hollowFlattery ? -45 : pressure ? -50 : 15, "Uważaj na zbyt ładne słowa."));
        break;
      case "fairness":
        votes.push(vote(agent.id, agent.label, positive ? 60 : -5, "Uczciwy targ ma sens."));
        break;
      case "honor":
        votes.push(
          vote(agent.id, agent.label, identityAttack ? -70 : identityAffirmation ? 40 : positive ? 35 : -15, identityAttack ? "To rana honoru." : "Szacunek słychać."),
        );
        break;
      case "ego":
        votes.push(
          vote(agent.id, agent.label, identityAttack ? -85 : identityAffirmation ? 25 : hollowFlattery ? -30 : -40, "Nie oddam twarzy tak łatwo."),
        );
        break;
      case "duty":
        votes.push(vote(agent.id, agent.label, messageIntent === "fair_argument" ? 50 : 5, "Obowiązek może wymagać prawdy."));
        break;
      case "suspicion":
        votes.push(vote(agent.id, agent.label, hollowFlattery || pressure ? -55 : 10, "Co naprawdę chce osiągnąć?"));
        break;
      case "pragmatism":
        votes.push(vote(agent.id, agent.label, messageIntent === "fair_argument" ? 55 : 15, "Prosta umowa może działać."));
        break;
      case "patience":
        votes.push(vote(agent.id, agent.label, pressure ? -60 : messageIntent === "storytelling" ? 40 : 10, pressure ? "Za szybko." : "Ma czas słuchać."));
        break;
      case "humility":
        votes.push(vote(agent.id, agent.label, messageIntent === "fair_argument" ? 45 : 15, "Pokora otwiera drogę."));
        break;
      case "strategist":
        votes.push(
          vote(agent.id, agent.label, identityAffirmation && messageIntent === "fair_argument" ? 70 : identityAttack ? -20 : 25, "Kontrolowane ustępstwo może wzmocnić władzę."),
        );
        break;
      case "conscience":
        votes.push(
          vote(agent.id, agent.label, messageIntent === "fair_argument" ? 75 : psychState.unconscious.guilt > 50 ? 40 : 15, "Prawda domaga się głosu."),
        );
        break;
      case "insight":
        votes.push(vote(agent.id, agent.label, messageIntent === "fair_argument" ? 65 : 20, "Sens jest ważniejszy niż pochlebstwo."));
        break;
      case "distance":
        votes.push(vote(agent.id, agent.label, hollowFlattery ? -50 : 10, "Zachowaj dystans."));
        break;
      case "guard":
      default:
        votes.push(
          vote(agent.id, agent.label, hollowFlattery ? -55 : pressure ? -45 : identityAttack ? -35 : 5, "Nie ufaj zbyt szybko."),
        );
        break;
    }
  }

  return votes;
}

export function councilScore(votes: InnerVote[]): number {
  if (!votes.length) return 0;
  return votes.reduce((sum, vote) => sum + vote.stance, 0) / votes.length;
}

export function parseCouncilVotesFromCharacter(raw: unknown): InnerVote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      if (typeof record.agent !== "string") return null;
      return {
        agent: record.agent,
        stance: clamp(Number(record.stance) || 0),
        reason: typeof record.reason === "string" ? record.reason : "",
      };
    })
    .filter((entry): entry is InnerVote => entry !== null);
}
