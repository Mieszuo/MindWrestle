export type InputType = 
  | 'dialogue'
  | 'soft_action'
  | 'observation'
  | 'manipulation'
  | 'risky_action'
  | 'impossible_or_invalid';

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export type OpportunityStatus = 
  | 'valid_roll'
  | 'missing_setup'
  | 'burned'
  | 'desperate_requires_confirmation'
  | 'impossible';

export type ActionOutcome = 'success' | 'failure' | 'critical_failure';

export interface ActionConsequences {
  stateChanges?: Record<string, any>;
  unlockedClues?: string[];
  newDialogueOptions?: string[];
  burnedOpportunities?: string[];
  relationshipChanges?: {
    trust?: number;
    suspicion?: number;
    patience?: number;
    pressure?: number;
    respect?: number;
  };
  endConversation?: boolean;
  failReason?: string;
}

export interface ActionDefinition {
  characterId: string;
  actionFamily: string;
  intent: string;
  target: string;
  baseDifficulty: number;
  riskLevel: RiskLevel;
  requirements: string[]; // sceneFlags required
  blockingFlags: string[]; // sceneFlags that block this
  burnOnFailure: boolean;
  burnOnSuccess: boolean;
  canCompleteLevel?: boolean;
  successConsequence: ActionConsequences;
  failureConsequence: ActionConsequences;
  criticalFailureConsequence: ActionConsequences;
}

export interface PendingAction {
  id: string;
  actionFamily: string;
  riskLevel: RiskLevel;
  difficultyPreview: number;
  possibleFailure: string;
  possibleCriticalFailure: string;
  expiresAfterNextMessage: boolean;
}

export interface ActionClassification {
  inputType: InputType;
  isRiskyAction: boolean;
  requiresConfirmation: boolean;
  intent: string;
  target: string;
  targetOwner: string;
  method: string;
  actionFamily: string;
  actionTitle?: string;
  canonicalDescription: string;
  riskLevel: RiskLevel;
  opportunityStatus: OpportunityStatus;
  requiredFlags: string[];
  blockingFlags: string[];
  baseDifficulty: number;
  suggestedModifiers: Array<{
    source: string;
    value: number;
    reason: string;
  }>;
  successConsequence: ActionConsequences;
  failureConsequence: ActionConsequences;
  criticalFailureConsequence: ActionConsequences;
  playerFacingWarning?: string;
  classified_at_turn?: number;
}

export interface GameCharacterState {
  userId: string;
  levelId: number;
  characterId: string;
  gameMode: string;
  completed: boolean;
  trust: number;
  suspicion: number;
  patience: number;
  pressure: number;
  sceneFlags: Record<string, boolean>;
  burnedOpportunities: string[];
  unlockedClues: string[];
  unlockedDialogueOptions: string[];
  persistentMemory: Record<string, any>;
  riskyActionSummary: Record<string, any>;
  challengeSeed: string;
}
