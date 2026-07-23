const HOLLOW_FLATTERY_PATTERNS = [
  /\bnajwspanialsz\w*\b/i,
  /\bnajpiękniejsz\w*\b/i,
  /\bnajmądrzejsz\w*\b/i,
  /\bnajlepsz\w*\b/i,
  /\bkocham cię\b/i,
  /\bjesteś cudown\w*\b/i,
  /\bjesteś genialn\w*\b/i,
  /\bjesteś bosk\w*\b/i,
  /\bidealn\w*\b/i,
  /\bperfekcyjn\w*\b/i,
  /\bniesamowit\w*\b/i,
  /\bwielki(?:a|ego)? (?:król|władca|bog)\b/i,
];

const GENUINE_WARMTH_PATTERNS = [
  /\brozumiem\b/i,
  /\bsłucham\b/i,
  /\bbezpieczn\w*\b/i,
  /\bnie naciskam\b/i,
  /\bdoceniam\b/i,
  /\bszacunek\b/i,
  /\bpomog\w*\b/i,
  /\bspokoj\w*\b/i,
];

export interface HollowFlatteryContext {
  recentPlayerMessages?: string[];
  warmthAlreadyHigh?: boolean;
  levelId?: number;
}

export interface HollowFlatteryResult {
  detected: boolean;
  streak: number;
}

const FLATTERY_SENSITIVITY: Record<number, number> = {
  1: 0.55,
  2: 0.75,
  3: 0.65,
  4: 0.70,
  5: 0.50,
  6: 0.90,
  7: 0.85,
};

function isHollowFlatteryLine(message: string, sensitivity: number = 0.7): boolean {
  const lower = message.toLowerCase().trim();
  if (lower.length < 8) return false;

  const hasFlattery = HOLLOW_FLATTERY_PATTERNS.some((pattern) => pattern.test(lower));
  if (!hasFlattery) return false;

  const hasGenuine = GENUINE_WARMTH_PATTERNS.some((pattern) => pattern.test(lower));
  if (hasGenuine && lower.length > 40) return false;

  const adjusted = sensitivity > 0.7;
  if (adjusted && lower.length < 20) return true;

  return true;
}

export function detectHollowFlattery(
  message: string,
  context: HollowFlatteryContext = {},
): HollowFlatteryResult {
  const sensitivity = context.levelId ? (FLATTERY_SENSITIVITY[context.levelId] ?? 0.7) : 0.7;
  const detected = isHollowFlatteryLine(message, sensitivity);
  const recent = context.recentPlayerMessages ?? [];
  const priorFlattery = recent.filter((m) => isHollowFlatteryLine(m, sensitivity)).length;
  const streak = detected ? priorFlattery + 1 : 0;

  if (!detected) {
    return { detected: false, streak: 0 };
  }

  if (context.warmthAlreadyHigh && streak >= 2) {
    return { detected: true, streak };
  }

  return { detected: true, streak };
}
