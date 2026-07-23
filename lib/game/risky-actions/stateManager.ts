import { ActionOutcome, ActionDefinition, GameCharacterState } from './types';

export function applyRiskyActionOutcome(
  outcome: ActionOutcome,
  actionDef: ActionDefinition,
  currentState: GameCharacterState
): GameCharacterState {
  const newState = { ...currentState };
  // Clone nested objects to avoid mutation
  newState.sceneFlags = { ...currentState.sceneFlags };
  newState.persistentMemory = { ...currentState.persistentMemory };
  newState.unlockedClues = [...currentState.unlockedClues];
  newState.unlockedDialogueOptions = [...currentState.unlockedDialogueOptions];
  newState.burnedOpportunities = [...currentState.burnedOpportunities];

  const consequences = 
    outcome === 'success' ? actionDef.successConsequence :
    outcome === 'critical_failure' ? actionDef.criticalFailureConsequence :
    actionDef.failureConsequence;

  // 1. Apply State Changes (Scene Flags)
  if (consequences.stateChanges) {
    for (const [key, value] of Object.entries(consequences.stateChanges)) {
      newState.sceneFlags[key] = value;
    }
  }

  // 2. Apply Relationship Changes
  if (consequences.relationshipChanges) {
    if (consequences.relationshipChanges.trust !== undefined) {
      newState.trust = Math.max(0, Math.min(100, newState.trust + consequences.relationshipChanges.trust));
    }
    if (consequences.relationshipChanges.suspicion !== undefined) {
      newState.suspicion = Math.max(0, Math.min(100, newState.suspicion + consequences.relationshipChanges.suspicion));
    }
    if (consequences.relationshipChanges.patience !== undefined) {
      newState.patience = Math.max(0, Math.min(100, newState.patience + consequences.relationshipChanges.patience));
    }
    if (consequences.relationshipChanges.pressure !== undefined) {
      newState.pressure = Math.max(0, Math.min(100, newState.pressure + consequences.relationshipChanges.pressure));
    }
  }

  // 3. Unlock Clues and Dialogue Options (Success path usually)
  if (consequences.unlockedClues) {
    consequences.unlockedClues.forEach(clue => {
      if (!newState.unlockedClues.includes(clue)) {
        newState.unlockedClues.push(clue);
      }
    });
  }

  if (consequences.newDialogueOptions) {
    consequences.newDialogueOptions.forEach(opt => {
      if (!newState.unlockedDialogueOptions.includes(opt)) {
        newState.unlockedDialogueOptions.push(opt);
      }
    });
  }

  // 4. Burn Opportunities
  if (actionDef.burnOnSuccess && outcome === 'success') {
    if (!newState.burnedOpportunities.includes(actionDef.actionFamily)) {
      newState.burnedOpportunities.push(actionDef.actionFamily);
    }
  }
  if (actionDef.burnOnFailure && (outcome === 'failure' || outcome === 'critical_failure')) {
    if (!newState.burnedOpportunities.includes(actionDef.actionFamily)) {
      newState.burnedOpportunities.push(actionDef.actionFamily);
    }
  }

  // 5. Explicitly check if it can complete the level (Rare)
  if (outcome === 'success' && actionDef.canCompleteLevel) {
    newState.completed = true;
  }

  return newState;
}
