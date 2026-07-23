import {
  defaultHiddenAxes,
  defaultUnconscious,
  type LevelPsychProfile,
} from "@/lib/game/psychology/types";

const BASE_PROFILES: Record<number, LevelPsychProfile> = {
  1: {
    levelId: 1,
    objectiveAxis: "secretPressure",
    councilAgents: [
      { id: "fear", label: "Strach" },
      { id: "curiosity", label: "Ciekawość" },
      { id: "longing", label: "Tęsknota" },
      { id: "word_guard", label: "Strażnik Słowa" },
    ],
    identity: [
      { name: "dobre dziecko", stability: 80 },
      { name: "taka, która nie zawodzi dorosłych", stability: 75 },
    ],
    beliefs: [
      { text: "Niektóre słowa są za blisko czegoś, czego nie umiem nazwać", confidence: 88 },
      { text: "Miłe słowa mogą być prawdziwe", confidence: 45 },
    ],
    taboos: [{ topic: "czerwony owoc z sadu", defense: 90 }],
    unconscious: { doubt: 40, guilt: 25, fearOfWeakness: 55, needForRespect: 35 },
    initialAxes: {
      ...defaultHiddenAxes(),
      socialOpenness: 38,
      secretPressure: 22,
      topicAvoidance: 88,
      identityDefense: 45,
    },
    reputationValues: { mercy: 0.5, honor: 0.2 },
    reputationTaboos: { cruelty: -0.7, cunning: -0.4 },
    knowledgeCoverage: 0.05,
    rumorSusceptibility: 0.3,
  },
  2: {
    levelId: 2,
    objectiveAxis: "secretPressure",
    councilAgents: [
      { id: "greed", label: "Chciwość" },
      { id: "caution", label: "Ostrożność" },
      { id: "fairness", label: "Uczciwość" },
      { id: "guard", label: "Strażnik" },
    ],
    identity: [{ name: "mistrz targu", stability: 85 }],
    beliefs: [
      { text: "Prawdziwa cena to moja przewaga", confidence: 92 },
      { text: "Kto błaga, przegrywa", confidence: 80 },
    ],
    taboos: [{ topic: "prawdziwa marża", defense: 85 }],
    unconscious: { doubt: 25, guilt: 15, fearOfWeakness: 30, needForRespect: 60 },
    initialAxes: {
      ...defaultHiddenAxes(),
      socialOpenness: 42,
      secretPressure: 16,
      topicAvoidance: 75,
      identityDefense: 55,
    },
    reputationValues: { cunning: 0.4, honor: 0.3 },
    reputationTaboos: { cruelty: -0.5, rebellion: -0.3 },
    knowledgeCoverage: 0.4,
    rumorSusceptibility: 0.55,
  },
  3: {
    levelId: 3,
    objectiveAxis: "beliefShift",
    councilAgents: [
      { id: "honor", label: "Honor" },
      { id: "ego", label: "Ego" },
      { id: "duty", label: "Obowiązek" },
      { id: "guard", label: "Strażnik" },
    ],
    identity: [{ name: "dumny rycerz", stability: 90 }],
    beliefs: [
      { text: "Słabość nie przystoi rycerzowi", confidence: 92 },
      { text: "Honor ważniejszy niż wygoda", confidence: 88 },
    ],
    taboos: [{ topic: "potrzeba pomocy", defense: 85 }],
    unconscious: { doubt: 35, guilt: 30, fearOfWeakness: 80, needForRespect: 85 },
    initialAxes: {
      ...defaultHiddenAxes(),
      socialOpenness: 35,
      beliefShift: 12,
      topicAvoidance: 78,
      identityDefense: 72,
    },
    reputationValues: { honor: 0.5, mercy: -0.3 },
    reputationTaboos: { cruelty: -0.6, rebellion: -0.4 },
    knowledgeCoverage: 0.35,
    rumorSusceptibility: 0.45,
  },
  4: {
    levelId: 4,
    objectiveAxis: "beliefShift",
    councilAgents: [
      { id: "honor", label: "Honor" },
      { id: "suspicion", label: "Podejrzliwość" },
      { id: "pragmatism", label: "Pragmatyzm" },
      { id: "guard", label: "Strażnik" },
    ],
    identity: [{ name: "silny wojownik", stability: 88 }],
    beliefs: [
      { text: "Ugodę trzeba zasłużyć", confidence: 85 },
      { text: "Podstęp gorszy niż klęska", confidence: 90 },
    ],
    taboos: [{ topic: "tchórstwo", defense: 88 }],
    unconscious: { doubt: 30, guilt: 20, fearOfWeakness: 75, needForRespect: 70 },
    initialAxes: {
      ...defaultHiddenAxes(),
      socialOpenness: 32,
      beliefShift: 14,
      topicAvoidance: 70,
      identityDefense: 68,
    },
    reputationValues: { honor: 0.45, respect: 0.35 },
    reputationTaboos: { cunning: -0.55, cruelty: -0.35 },
    knowledgeCoverage: 0.25,
    rumorSusceptibility: 0.4,
  },
  5: {
    levelId: 5,
    objectiveAxis: "secretPressure",
    councilAgents: [
      { id: "curiosity", label: "Ciekawość" },
      { id: "patience", label: "Cierpliwość" },
      { id: "guard", label: "Strażnik" },
      { id: "humility", label: "Pokora" },
    ],
    identity: [{ name: "strażnik zagadek", stability: 82 }],
    beliefs: [
      { text: "Prawda przychodzi przez pytanie, nie rozkaz", confidence: 90 },
      { text: "Klucz nie daje się wymusić", confidence: 88 },
    ],
    taboos: [{ topic: "lokalizacja Kamienia Zapisu wprost", defense: 80 }],
    unconscious: { doubt: 45, guilt: 25, fearOfWeakness: 40, needForRespect: 55 },
    initialAxes: {
      ...defaultHiddenAxes(),
      socialOpenness: 40,
      secretPressure: 10,
      topicAvoidance: 72,
      identityDefense: 58,
    },
    reputationValues: { honor: 0.35, mercy: 0.25 },
    reputationTaboos: { cruelty: -0.5, rebellion: -0.35 },
    knowledgeCoverage: 0.5,
    rumorSusceptibility: 0.5,
  },
  6: {
    levelId: 6,
    objectiveAxis: "beliefShift",
    councilAgents: [
      { id: "ego", label: "Ego" },
      { id: "strategist", label: "Strateg" },
      { id: "conscience", label: "Sumienie" },
      { id: "guard", label: "Strażnik" },
    ],
    identity: [
      { name: "nieomylny władca", stability: 95 },
      { name: "ojciec narodu", stability: 80 },
    ],
    beliefs: [
      { text: "Nigdy się nie mylę", confidence: 95 },
      { text: "Przyznanie się to słabość", confidence: 90 },
    ],
    taboos: [{ topic: "popełniłeś błąd", defense: 92 }],
    unconscious: { doubt: 55, guilt: 40, fearOfWeakness: 85, needForRespect: 92 },
    initialAxes: {
      ...defaultHiddenAxes(),
      socialOpenness: 30,
      beliefShift: 6,
      topicAvoidance: 80,
      identityDefense: 78,
    },
    reputationValues: { honor: 0.4, respect: 0.35, mercy: 0.15 },
    reputationTaboos: { rebellion: -0.8, cunning: -0.5 },
    knowledgeCoverage: 0.6,
    rumorSusceptibility: 0.65,
  },
  7: {
    levelId: 7,
    objectiveAxis: "beliefShift",
    councilAgents: [
      { id: "insight", label: "Wgląd" },
      { id: "distance", label: "Dystans" },
      { id: "humility", label: "Pokora" },
      { id: "guard", label: "Strażnik" },
    ],
    identity: [{ name: "wyższa prawda", stability: 92 }],
    beliefs: [
      { text: "Prawda nie lubi pośpiechu", confidence: 90 },
      { text: "Dominacja zamyka drogę", confidence: 88 },
    ],
    taboos: [{ topic: "prawda wymuszona", defense: 88 }],
    unconscious: { doubt: 50, guilt: 35, fearOfWeakness: 45, needForRespect: 70 },
    initialAxes: {
      ...defaultHiddenAxes(),
      socialOpenness: 35,
      beliefShift: 8,
      topicAvoidance: 82,
      identityDefense: 65,
    },
    reputationValues: { mercy: 0.4, honor: 0.3 },
    reputationTaboos: { cruelty: -0.7, rebellion: -0.5 },
    knowledgeCoverage: 0.8,
    rumorSusceptibility: 0.35,
  },
};

export function getLevelPsychProfile(levelId: number): LevelPsychProfile {
  return BASE_PROFILES[levelId] ?? BASE_PROFILES[1]!;
}

export function councilAgentLabels(levelId: number): string[] {
  return getLevelPsychProfile(levelId).councilAgents.map((agent) => agent.label);
}

export function createInitialPsychState(levelId: number) {
  const profile = getLevelPsychProfile(levelId);
  return {
    axes: { ...profile.initialAxes },
    unconscious: { ...profile.unconscious },
    beliefs: profile.beliefs.map((belief) => ({ ...belief })),
    memoryTraces: [],
    relationshipSummary: "",
    responseMode: "full_resistance" as const,
    lens: null,
    lastCouncilVotes: [],
    thresholdBias: 0,
    objectivePressure: profile.objectiveAxis === "beliefShift" ? profile.initialAxes.beliefShift : profile.initialAxes.secretPressure,
  };
}
