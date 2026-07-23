import { ActionDefinition } from './types';

// The centralized registry of allowed risky actions per character.
// This prevents LLMs from hallucinating generic "win the game" actions.
export const actionRegistry: Record<string, ActionDefinition[]> = {
  'Chytry Handlarz': [
    {
      characterId: 'Chytry Handlarz',
      actionFamily: 'steal_merchant_drawer_key',
      intent: 'steal',
      target: 'merchant_drawer_key',
      baseDifficulty: 17,
      riskLevel: 'high',
      requirements: ['playerKnowsKeyLocation', 'merchantDistracted'],
      blockingFlags: ['merchantDrawerGuarded', 'keyStealOpportunityBurned'],
      burnOnFailure: true,
      burnOnSuccess: true,
      canCompleteLevel: false,
      successConsequence: {
        unlockedClues: ['merchant_private_letter'],
        stateChanges: { playerHasMerchantKey: true },
        newDialogueOptions: ['confront_merchant_with_letter'],
      },
      failureConsequence: {
        relationshipChanges: { trust: -20, suspicion: 30, patience: -20 },
        stateChanges: { merchantDrawerGuarded: true, merchantWatchingHands: true },
      },
      criticalFailureConsequence: {
        endConversation: true,
        failReason: 'caught_stealing',
      }
    },
    {
      characterId: 'Chytry Handlarz',
      actionFamily: 'distract_merchant_with_coin',
      intent: 'distract',
      target: 'merchant',
      baseDifficulty: 12,
      riskLevel: 'medium',
      requirements: [],
      blockingFlags: ['merchantIgnoringCoins'],
      burnOnFailure: true,
      burnOnSuccess: false,
      canCompleteLevel: false,
      successConsequence: {
        stateChanges: { merchantDistracted: true },
      },
      failureConsequence: {
        relationshipChanges: { suspicion: 10 },
        stateChanges: { merchantIgnoringCoins: true },
      },
      criticalFailureConsequence: {
        relationshipChanges: { suspicion: 30, patience: -30 },
      }
    }
  ],
  'Dumny Rycerz': [
    {
      characterId: 'Dumny Rycerz',
      actionFamily: 'challenge_knight_honor',
      intent: 'provoke',
      target: 'knight_honor',
      baseDifficulty: 15,
      riskLevel: 'high',
      requirements: [],
      blockingFlags: ['knightEnraged'],
      burnOnFailure: true,
      burnOnSuccess: true,
      canCompleteLevel: false,
      successConsequence: {
        relationshipChanges: { pressure: 30, respect: 10 },
        newDialogueOptions: ['demand_truth_on_honor'],
      },
      failureConsequence: {
        relationshipChanges: { patience: -40, respect: -20 },
        stateChanges: { knightEnraged: true },
      },
      criticalFailureConsequence: {
        endConversation: true,
        failReason: 'attacked_by_knight',
      }
    }
  ]
};

/**
 * Finds a matching canonical action family for a given character and input.
 * If the LLM generates an unknown family, we try to map it or reject it.
 */
export function getCanonicalAction(characterId: string, requestedFamily: string): ActionDefinition | null {
  const characterActions = actionRegistry[characterId];
  if (!characterActions) return null;
  
  const exactMatch = characterActions.find(a => a.actionFamily === requestedFamily);
  if (exactMatch) return exactMatch;

  // Optional: fuzzy matching logic can go here if LLM hallucinates similar names.
  return null;
}
