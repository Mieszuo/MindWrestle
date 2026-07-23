import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validation";
import { rollRiskyAction } from "@/lib/game/risky-actions/dice";
import { applyRiskyActionOutcome } from "@/lib/game/risky-actions/stateManager";
import { getCanonicalAction } from "@/lib/game/risky-actions/actionRegistry";
import { resolveRiskyAction } from "@/lib/game/risky-actions/actionResolver";
import type { GameCharacterState, ActionClassification } from "@/lib/game/risky-actions/types";
import { detectRequestLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/messages";

const confirmSchema = z.object({
  pendingActionId: z.string().uuid("Invalid pendingActionId"),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.user || !auth.supabase) return auth.response!;

  const rl = rateLimit(`risky:${auth.user.id}`, 10, 30_000);
  if (rl.limited) {
    return NextResponse.json({ error: "Too many actions. Wait a moment." }, { status: 429 });
  }

  const body = validateBody(await request.json().catch(() => null), confirmSchema);
  if (body instanceof NextResponse) return body;

  const { pendingActionId } = body;

  // 1. Fetch pending action from DB
  const { data: pendingActionRaw, error: fetchError } = await auth.supabase
    .from("pending_actions")
    .select("*")
    .eq("id", pendingActionId)
    .eq("user_id", auth.user.id)
    .single();

  const pendingAction = pendingActionRaw as Record<string, unknown> & { id: string } | null;

  if (fetchError || !pendingAction) {
    return NextResponse.json({ error: "Pending action not found or expired" }, { status: 404 });
  }

  // Check expiration
  if (new Date(pendingAction.expires_at as string) < new Date()) {
    return NextResponse.json({ error: "Pending action expired" }, { status: 410 });
  }

  // 2. Fetch the current character state
  const { data: attemptRaw } = await auth.supabase
    .from("conversation_attempts")
    .select("level_id, turns_count, game_levels(character_name)")
    .eq("id", pendingAction.attempt_id as string)
    .single();

  const attempt = attemptRaw as Record<string, unknown> | null;

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const levelId = attempt.level_id as number;
  const characterId = (attempt.game_levels as Record<string, string> | null)?.character_name || "Unknown";

  const { data: characterStateRaw, error: stateError } = await auth.supabase
    .from("game_character_progress")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("level_id", levelId)
    .single();

  const characterState = characterStateRaw as Record<string, unknown> | null;

  if (stateError || !characterState) {
    return NextResponse.json({ error: "Character state not found" }, { status: 404 });
  }

  // 3. Re-verify with Registry just in case
  const canonicalAction = getCanonicalAction(characterId, pendingAction.action_family as string);
  if (!canonicalAction) {
    return NextResponse.json({ error: "Action definition no longer exists" }, { status: 400 });
  }

  // 3.5. TOCTOU re-validation — re-check state at confirmation time
  const storedClassification = pendingAction.classification as ActionClassification;
  const risky = getDictionary(detectRequestLocale(request.headers)).content.riskyActions;
  const recheck = resolveRiskyAction(
    { ...storedClassification, inputType: "risky_action" as const },
    characterState as unknown as GameCharacterState,
    characterId,
    { unknownAction: risky.unknownAction, desperateConfirm: risky.desperateConfirm },
  );
  if (recheck.status === "burned") {
    return NextResponse.json({ error: risky.opportunityBurned }, { status: 409 });
  }
  if (recheck.status === "impossible") {
    return NextResponse.json({ error: risky.noLongerPossible }, { status: 409 });
  }

  // 4. Perform the deterministic roll
  const rawModifiers = (pendingAction.modifiers as unknown[]) || [];
  const numericModifiers: number[] = rawModifiers.map((m) =>
    typeof m === "object" && m !== null && "value" in m ? Number((m as { value: unknown }).value) || 0 : Number(m) || 0
  );

  const classificationMeta = pendingAction.classification as Record<string, unknown> | null;
  const classifiedAtTurn = typeof classificationMeta?.classified_at_turn === "number"
    ? classificationMeta.classified_at_turn
    : (attempt.turns_count as number);

  const rollResult = rollRiskyAction(
    auth.user.id,
    levelId,
    characterId,
    canonicalAction.actionFamily,
    String(classifiedAtTurn),
    (characterState.challenge_seed as string) || "default-seed",
    pendingAction.difficulty as number,
    numericModifiers,
    (characterState.game_mode as string) !== "practice"
  );

  // 5. Apply consequences to state
  const newState = applyRiskyActionOutcome(rollResult.outcome, canonicalAction, characterState as unknown as GameCharacterState);

  // 6. Save the new state back to the database
  await (auth.supabase as any)
    .from("game_character_progress")
    .update({
      trust: newState.trust,
      suspicion: newState.suspicion,
      patience: newState.patience,
      pressure: newState.pressure,
      scene_flags: newState.sceneFlags,
      burned_opportunities: newState.burnedOpportunities,
      unlocked_clues: newState.unlockedClues,
      unlocked_dialogue_options: newState.unlockedDialogueOptions,
      persistent_memory: newState.persistentMemory,
      updated_at: new Date().toISOString()
    })
    .eq("id", characterState.id as string);

  // 7. Delete the pending action so it can't be confirmed again
  await (auth.supabase as any)
    .from("pending_actions")
    .delete()
    .eq("id", pendingActionId);

  // 8. Log the result in conversation messages as a SYSTEM_EVENT or similar
  await auth.supabase
    .from("conversation_messages")
    .insert({
      attempt_id: pendingAction.attempt_id as string,
      user_id: auth.user.id,
      level_id: levelId,
      role: "SYSTEM",
      turn_index: (attempt.turns_count as number) + 1,
      content: risky.testResult(canonicalAction.actionFamily, rollResult.totalScore, rollResult.outcome),
    });

  const { data: updatedAttempt } = await auth.supabase
    .from("conversation_attempts")
    .select(`
      *,
      messages:conversation_messages(*)
    `)
    .eq("id", pendingAction.attempt_id as string)
    .single();

  // Return outcome
  return NextResponse.json({ 
    success: true,
    roll: rollResult,
    newState,
    attempt: updatedAttempt
  });
}
