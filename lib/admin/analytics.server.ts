import { createServiceRoleClient } from "@/lib/supabase/service";

export interface AdminUserRow {
  userId: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  attemptsCount: number;
  completedAttemptsCount: number;
  completedLevelsCount: number;
  lastActivityAt: string | null;
  aiCalls: number;
  aiCallsFailed: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface AdminAnalyticsSummary {
  usersCount: number;
  attemptsCount: number;
  aiCalls: number;
  aiCallsFailed: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  trackingSince: string | null;
}

export interface AdminAnalyticsPayload {
  summary: AdminAnalyticsSummary;
  users: AdminUserRow[];
  byCallType: Array<{ callType: string; calls: number; totalTokens: number; costUsd: number }>;
  byModel: Array<{ model: string; calls: number; totalTokens: number; costUsd: number }>;
}

function sumCost(values: Array<number | string | null | undefined>) {
  return values.reduce<number>((sum, value) => {
    const parsed = Number(value);
    return sum + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchAllUsers(supabase: ReturnType<typeof createServiceRoleClient>) {
  const allUsers: Array<{ id: string; email?: string; created_at: string }> = [];
  let page: number | null = 1;

  while (page) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw new Error(result.error.message);

    allUsers.push(...(result.data.users as typeof allUsers));

    page = result.data.nextPage;
  }

  return allUsers;
}

export async function loadAdminAnalytics(): Promise<AdminAnalyticsPayload> {
  const supabase = createServiceRoleClient();

  const [profilesResult, attemptsResult, progressResult, usageResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name, created_at"),
    supabase
      .from("conversation_attempts")
      .select("id, user_id, status, last_activity_at, started_at"),
    supabase.from("user_level_progress").select("user_id, status"),
    supabase
      .from("ai_usage_events")
      .select(
        "user_id, call_type, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, success, created_at",
      ),
  ]);

  const authUsers = await fetchAllUsers(supabase);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (attemptsResult.error) throw new Error(attemptsResult.error.message);
  if (progressResult.error) throw new Error(progressResult.error.message);
  if (usageResult.error) throw new Error(usageResult.error.message);
  const profiles = profilesResult.data ?? [];
  const attempts = attemptsResult.data ?? [];
  const progressRows = progressResult.data ?? [];
  const usageEvents = usageResult.data ?? [];

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const attemptsByUser = new Map<
    string,
    { total: number; completed: number; lastActivity: string | null }
  >();

  for (const attempt of attempts) {
    const current = attemptsByUser.get(attempt.user_id) ?? {
      total: 0,
      completed: 0,
      lastActivity: null,
    };
    current.total += 1;
    if (attempt.status === "COMPLETED") current.completed += 1;
    const activityAt = attempt.last_activity_at ?? attempt.started_at;
    if (!current.lastActivity || activityAt > current.lastActivity) {
      current.lastActivity = activityAt;
    }
    attemptsByUser.set(attempt.user_id, current);
  }

  const completedLevelsByUser = new Map<string, number>();
  for (const row of progressRows) {
    if (row.status !== "COMPLETED") continue;
    completedLevelsByUser.set(row.user_id, (completedLevelsByUser.get(row.user_id) ?? 0) + 1);
  }

  const usageByUser = new Map<
    string,
    {
      calls: number;
      failed: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      costUsd: number;
    }
  >();

  const byCallType = new Map<string, { calls: number; totalTokens: number; costUsd: number }>();
  const byModel = new Map<string, { calls: number; totalTokens: number; costUsd: number }>();
  let trackingSince: string | null = null;

  for (const event of usageEvents) {
    if (!trackingSince || event.created_at < trackingSince) {
      trackingSince = event.created_at;
    }

    const userUsage = usageByUser.get(event.user_id) ?? {
      calls: 0,
      failed: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
    };
    userUsage.calls += 1;
    if (!event.success) userUsage.failed += 1;
    userUsage.promptTokens += toNumber(event.prompt_tokens);
    userUsage.completionTokens += toNumber(event.completion_tokens);
    userUsage.totalTokens += toNumber(event.total_tokens);
    userUsage.costUsd += toNumber(event.cost_usd);
    usageByUser.set(event.user_id, userUsage);

    const callBucket = byCallType.get(event.call_type) ?? { calls: 0, totalTokens: 0, costUsd: 0 };
    callBucket.calls += 1;
    callBucket.totalTokens += toNumber(event.total_tokens);
    callBucket.costUsd += toNumber(event.cost_usd);
    byCallType.set(event.call_type, callBucket);

    const modelBucket = byModel.get(event.model) ?? { calls: 0, totalTokens: 0, costUsd: 0 };
    modelBucket.calls += 1;
    modelBucket.totalTokens += toNumber(event.total_tokens);
    modelBucket.costUsd += toNumber(event.cost_usd);
    byModel.set(event.model, modelBucket);
  }

  const userIds = new Set<string>([
    ...authUsers.map((user) => user.id),
    ...profiles.map((profile) => profile.id),
    ...attempts.map((attempt) => attempt.user_id),
    ...usageEvents.map((event) => event.user_id),
  ]);

  const users: AdminUserRow[] = [...userIds].map((userId) => {
    const authUser = authUsers.find((user) => user.id === userId);
    const profile = profileById.get(userId);
    const attemptStats = attemptsByUser.get(userId);
    const usage = usageByUser.get(userId);

    return {
      userId,
      email: authUser?.email ?? null,
      displayName: profile?.display_name ?? null,
      createdAt: profile?.created_at ?? authUser?.created_at ?? new Date(0).toISOString(),
      attemptsCount: attemptStats?.total ?? 0,
      completedAttemptsCount: attemptStats?.completed ?? 0,
      completedLevelsCount: completedLevelsByUser.get(userId) ?? 0,
      lastActivityAt: attemptStats?.lastActivity ?? null,
      aiCalls: usage?.calls ?? 0,
      aiCallsFailed: usage?.failed ?? 0,
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
      costUsd: usage?.costUsd ?? 0,
    };
  });

  users.sort((a, b) => {
    if (b.totalTokens !== a.totalTokens) return b.totalTokens - a.totalTokens;
    return b.attemptsCount - a.attemptsCount;
  });

  const summary: AdminAnalyticsSummary = {
    usersCount: users.length,
    attemptsCount: attempts.length,
    aiCalls: usageEvents.length,
    aiCallsFailed: usageEvents.filter((event) => !event.success).length,
    promptTokens: usageEvents.reduce((sum, event) => sum + toNumber(event.prompt_tokens), 0),
    completionTokens: usageEvents.reduce((sum, event) => sum + toNumber(event.completion_tokens), 0),
    totalTokens: usageEvents.reduce((sum, event) => sum + toNumber(event.total_tokens), 0),
    costUsd: sumCost(usageEvents.map((event) => event.cost_usd)),
    trackingSince,
  };

  return {
    summary,
    users,
    byCallType: [...byCallType.entries()]
      .map(([callType, stats]) => ({ callType, ...stats }))
      .sort((a, b) => b.totalTokens - a.totalTokens),
    byModel: [...byModel.entries()]
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.totalTokens - a.totalTokens),
  };
}
