import { ActionOutcome } from './types';
import crypto from 'crypto';

export interface RollResult {
  roll: number;
  modifiersTotal: number;
  totalScore: number;
  difficulty: number;
  outcome: ActionOutcome;
  isDeterministic: boolean;
}

/**
 * Generates a deterministic hash-based D20 roll using the provided seed.
 * Ensures that repeating the exact same action setup yields the exact same roll,
 * preventing save-scumming by reloading the page.
 */
export function rollRiskyAction(
  userId: string,
  levelId: number,
  characterId: string,
  actionFamily: string,
  opportunityId: string,
  challengeSeed: string,
  difficulty: number,
  modifiers: number[] = [],
  isRanked: boolean = true
): RollResult {
  let roll = 0;

  if (isRanked) {
    // Deterministic mode
    const seedString = `${userId}-${levelId}-${characterId}-${actionFamily}-${opportunityId}-${challengeSeed}`;
    const hash = crypto.createHash('sha256').update(seedString).digest('hex');
    // Extract a number from the first 8 characters of the hash
    const hashInt = parseInt(hash.substring(0, 8), 16);
    // D20: 1 to 20
    roll = (hashInt % 20) + 1;
  } else {
    // Non-deterministic mode (Practice / Story)
    roll = Math.floor(Math.random() * 20) + 1;
  }

  const modifiersTotal = modifiers.reduce((acc, val) => acc + val, 0);
  const totalScore = roll + modifiersTotal;

  let outcome: ActionOutcome = 'failure';

  if (roll === 1) {
    outcome = 'critical_failure';
  } else if (roll === 20) {
    outcome = 'success';
  } else if (totalScore >= difficulty) {
    outcome = 'success';
  }

  return {
    roll,
    modifiersTotal,
    totalScore,
    difficulty,
    outcome,
    isDeterministic: isRanked
  };
}
