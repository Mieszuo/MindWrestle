import { describe, expect, it, vi } from "vitest";

import { createAttemptWithCredit, NoAttemptCreditsError } from "@/lib/billing/attempts.server";

type RpcResult = { data: unknown; error: { message: string } | null };

function fakeSupabase(result: RpcResult) {
  const rpc = vi.fn().mockResolvedValue(result);
  // Only `.rpc` is exercised by createAttemptWithCredit.
  return { supabase: { rpc } as never, rpc };
}

const params = {
  levelId: 1,
  progressId: "progress-1",
  emotionState: { trust: 10 },
  reputationSession: { wins: 0 },
  reputationContext: { rumorLine: null },
  psychState: null,
  now: "2026-07-22T00:00:00.000Z",
};

describe("createAttemptWithCredit", () => {
  it("calls the atomic RPC and returns the inserted attempt on success", async () => {
    const attemptRow = { id: "attempt-1", level_id: 1, status: "IN_PROGRESS" };
    const { supabase, rpc } = fakeSupabase({
      data: [
        {
          allowed: true,
          source: "paid_pack",
          free_remaining: 0,
          paid_remaining: 4,
          attempt: attemptRow,
        },
      ],
      error: null,
    });

    const result = await createAttemptWithCredit(supabase, "user-1", params);

    expect(rpc).toHaveBeenCalledWith(
      "start_attempt_atomic",
      expect.objectContaining({
        p_user_id: "user-1",
        p_level_id: 1,
        p_progress_id: "progress-1",
        p_emotion_state: params.emotionState,
      }),
    );
    expect(result.attempt).toEqual(attemptRow);
    expect(result.source).toBe("paid_pack");
    expect(result.paidRemaining).toBe(4);
  });

  it("throws NoAttemptCreditsError (with remaining counts) when the wallet is empty", async () => {
    const { supabase } = fakeSupabase({
      data: [
        {
          allowed: false,
          source: null,
          free_remaining: 0,
          paid_remaining: 0,
          attempt: null,
        },
      ],
      error: null,
    });

    await expect(createAttemptWithCredit(supabase, "user-1", params)).rejects.toBeInstanceOf(
      NoAttemptCreditsError,
    );
  });

  it("does not treat a rolled-back insert as a spent credit (no row => not allowed)", async () => {
    // When the atomic RPC raises/rolls back it returns no row; the wallet stays intact
    // and the caller must surface NO_ATTEMPTS_LEFT rather than a silently-lost attempt.
    const { supabase } = fakeSupabase({ data: [], error: null });

    await expect(createAttemptWithCredit(supabase, "user-1", params)).rejects.toBeInstanceOf(
      NoAttemptCreditsError,
    );
  });

  it("propagates a database error", async () => {
    const { supabase } = fakeSupabase({ data: null, error: { message: "boom" } });

    await expect(createAttemptWithCredit(supabase, "user-1", params)).rejects.toThrow("boom");
  });
});
