import { ActionClassification, GameCharacterState } from './types';
import { callOpenRouter } from '@/lib/ai/openrouter';
import { parseJsonObject, stringArray, booleanValue, numberValue } from '@/lib/ai/json';

const CLASSIFICATION_SYSTEM_PROMPT = `
You are an intent classifier for a narrative RPG game.
The user will input an action or dialogue.
Your job is to classify this input strictly into one of the following categories and return a JSON object.

Types:
- dialogue: The user is just talking. No action.
- soft_action: A minor narrative action with no risk (e.g., "I smile", "I look around the room").
- observation: The user is looking for clues (e.g., "I check if he's looking at the drawer").
- manipulation: The user is bluffing, intimidating, or lying during conversation without a physical risky act.
- risky_action: A high-stakes physical or extreme social act (stealing, attacking, picking a lock, impersonating).
- impossible_or_invalid: An action that makes no physical or logical sense given the scene.

Rules:
1. Try to map risky actions to one of the provided available actions.
2. If it perfectly matches an available action, set actionFamily to that action's ID.
3. If it does not match, but is a valid risky action, set actionFamily to "unknown_risky_action".
4. If the action is highly risky (e.g., stealing, violence), set requiresConfirmation to true.
5. Return ONLY a JSON object with these keys: 
   - inputType (string)
   - isRiskyAction (boolean)
   - requiresConfirmation (boolean)
   - intent (string)
   - target (string)
   - method (string)
   - actionFamily (string)
   - riskLevel ("low" | "medium" | "high" | "extreme")
   - playerFacingWarning (string, a short player-facing warning in the same language as the player's input if requiresConfirmation is true)
`;

export async function classifyPlayerInput(
  message: string,
  characterState: GameCharacterState,
  availableActionsInfo: string = ''
): Promise<ActionClassification> {
  const fallbackResponse: ActionClassification = {
    inputType: 'dialogue',
    isRiskyAction: false,
    requiresConfirmation: false,
    intent: 'converse',
    target: '',
    targetOwner: '',
    method: 'speech',
    actionFamily: 'none',
    canonicalDescription: 'User is talking.',
    riskLevel: 'low',
    opportunityStatus: 'valid_roll',
    requiredFlags: [],
    blockingFlags: [],
    baseDifficulty: 10,
    suggestedModifiers: [],
    successConsequence: {},
    failureConsequence: {},
    criticalFailureConsequence: {},
  };

  const systemMessage = `${CLASSIFICATION_SYSTEM_PROMPT}

Available actions for this character:
${availableActionsInfo || 'None specified.'}`;

  try {
    const response = await callOpenRouter({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: message }
      ],
      temperature: 0.2
    });

    if (!response) {
      return fallbackResponse;
    }

    const parsed = parseJsonObject(response);
    if (!parsed) return fallbackResponse;

    return {
      inputType: (parsed.inputType as string) || 'dialogue',
      isRiskyAction: booleanValue(parsed.isRiskyAction, false),
      requiresConfirmation: booleanValue(parsed.requiresConfirmation, false),
      intent: (parsed.intent as string) || 'converse',
      target: (parsed.target as string) || '',
      targetOwner: '',
      method: (parsed.method as string) || 'speech',
      actionFamily: (parsed.actionFamily as string) || 'none',
      canonicalDescription: '',
      riskLevel: (parsed.riskLevel as 'low' | 'medium' | 'high' | 'extreme') || 'low',
      opportunityStatus: 'valid_roll',
      requiredFlags: [],
      blockingFlags: [],
      baseDifficulty: 10,
      suggestedModifiers: [],
      successConsequence: {},
      failureConsequence: {},
      criticalFailureConsequence: {},
      playerFacingWarning: (parsed.playerFacingWarning as string) || ''
    } as ActionClassification;

  } catch (err) {
    console.error('Failed to classify player input:', err);
    return fallbackResponse;
  }
}
