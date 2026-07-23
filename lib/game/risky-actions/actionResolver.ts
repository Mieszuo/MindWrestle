import { ActionClassification, ActionDefinition, GameCharacterState, OpportunityStatus } from './types';
import { getCanonicalAction } from './actionRegistry';

export interface ResolverResult {
  status: OpportunityStatus;
  canonicalAction: ActionDefinition | null;
  warning?: string;
}

export function resolveRiskyAction(
  classification: ActionClassification,
  characterState: GameCharacterState,
  characterId: string,
  copy: { unknownAction: string; desperateConfirm: string }
): ResolverResult {
  // If LLM says it's not a risky action, just pass it through
  if (classification.inputType !== 'risky_action' && classification.inputType !== 'manipulation') {
    return { status: 'valid_roll', canonicalAction: null };
  }

  // Find the canonical action in the registry
  const canonicalAction = getCanonicalAction(characterId, classification.actionFamily);
  
  if (!canonicalAction) {
    // If LLM hallucinated an action, reject or fallback to generic
    return { 
      status: 'impossible', 
      canonicalAction: null,
      warning: copy.unknownAction
    };
  }

  // 1. Check if the opportunity is burned
  if (characterState.burnedOpportunities.includes(canonicalAction.actionFamily)) {
    return { status: 'burned', canonicalAction };
  }

  // 2. Check if blocking flags are active
  const hasBlockingFlag = canonicalAction.blockingFlags.some(flag => characterState.sceneFlags[flag] === true);
  if (hasBlockingFlag) {
    return { status: 'impossible', canonicalAction };
  }

  // 3. Check if required setup is missing
  const missingRequirements = canonicalAction.requirements.filter(req => characterState.sceneFlags[req] !== true);
  
  if (missingRequirements.length > 0) {
    // If the player forces an action without setup, it's either missing_setup or desperate
    if (classification.riskLevel === 'extreme' || classification.riskLevel === 'high') {
      return { 
        status: 'desperate_requires_confirmation', 
        canonicalAction,
        warning: copy.desperateConfirm
      };
    } else {
      return { status: 'missing_setup', canonicalAction };
    }
  }

  // If all checks pass
  return { status: 'valid_roll', canonicalAction };
}
