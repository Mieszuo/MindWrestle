import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

import { actionRegistry } from "@/lib/game/risky-actions/actionRegistry";
import { classifyPlayerInput } from "@/lib/game/risky-actions/actionClassifier";
import { resolveRiskyAction } from "@/lib/game/risky-actions/actionResolver";
import { GameCharacterState } from "@/lib/game/risky-actions/types";
import { getDictionary } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";

export interface RiskyPipelineResult {
  requiresConfirmation: boolean;
  pendingActionId?: string;
  warning?: string;
  actionTitle?: string;
  difficulty?: number;
  rejectionReason?: string;
  classification?: unknown;
}

// Helper function to inject into engine.server.ts
export async function handleRiskyActionPipeline(
  supabase: Db,
  userId: string,
  levelId: number,
  characterName: string,
  attemptId: string,
  content: string,
  turnsCount: number,
  locale: Locale,
) {
  const risky = getDictionary(locale).content.riskyActions;

  // 1. Get or create character state
  let { data: characterState } = await (supabase as any)
    .from("game_character_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("level_id", levelId)
    .single();

  if (!characterState) {
    // Create baseline
    const { data: newDbState } = await (supabase as any)
      .from("game_character_progress")
      .insert({
        user_id: userId,
        level_id: levelId,
        character_id: characterName,
        game_mode: "ranked",
        challenge_seed: Math.random().toString(36).substring(7)
      })
      .select("*")
      .single();
    characterState = newDbState;
  }

  const availableActions = actionRegistry[characterName] || [];
  const actionsInfo = JSON.stringify(availableActions, null, 2);

  // 2. Classify
  const classification = await classifyPlayerInput(
    content, 
    characterState as unknown as GameCharacterState, 
    actionsInfo
  );

  // 3. Resolve
  if (classification.inputType === 'risky_action' || classification.inputType === 'manipulation') {
    const resolution = resolveRiskyAction(
      classification,
      characterState as unknown as GameCharacterState,
      characterName,
      { unknownAction: risky.unknownAction, desperateConfirm: risky.desperateConfirm }
    );

    const canRoll = resolution.status === 'valid_roll' || resolution.status === 'desperate_requires_confirmation';
    const needsConfirmation = resolution.status === 'desperate_requires_confirmation' || classification.requiresConfirmation;

    if (canRoll && needsConfirmation) {
      const { data: pendingAction } = await (supabase as any)
        .from("pending_actions")
        .insert({
          user_id: userId,
          attempt_id: attemptId,
          action_family: classification.actionFamily,
          classification: {
            ...classification,
            classified_at_turn: turnsCount,
          },
          difficulty: classification.baseDifficulty,
          modifiers: classification.suggestedModifiers,
          possible_consequences: {},
          expires_at: new Date(Date.now() + 1000 * 60 * 5).toISOString()
        })
        .select("id")
        .single();

      const confirmResult: RiskyPipelineResult = {
        requiresConfirmation: true,
        pendingActionId: pendingAction?.id,
        warning: resolution.warning || classification.playerFacingWarning,
        actionTitle: classification.actionTitle || resolution.canonicalAction?.actionFamily,
        difficulty: classification.baseDifficulty,
      };

      return confirmResult;
    }

    // Build rejection reason for non-confirmation outcomes
    let rejectionReason: string | undefined;
    switch (resolution.status) {
      case "burned":
        rejectionReason = risky.opportunityBurned;
        break;
      case "missing_setup":
        rejectionReason = risky.missingSetup;
        break;
      case "impossible":
        rejectionReason = resolution.warning || risky.impossibleHere;
        break;
    }

    const result: RiskyPipelineResult = {
      requiresConfirmation: false,
      rejectionReason,
      classification,
    };

    return result;
  }

  return { requiresConfirmation: false, classification, rejectionReason: undefined };
}
