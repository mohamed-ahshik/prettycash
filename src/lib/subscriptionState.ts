const DAY_MS = 24 * 60 * 60 * 1000;
export const TRIAL_DAYS = 7;
export const DAILY_TRIAL_SCAN_LIMIT = 3;

export type ScanBlockReason = 'allowed' | 'daily_trial_limit' | 'subscription_required';

export interface TrialState {
  isTrialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
}

export interface ScanAccessInput {
  isPro: boolean;
  isTrialActive: boolean;
  dailyScansUsed: number;
  dailyLimit?: number;
}

export function deriveTrial(
  createdAt: Date | string | null | undefined,
  now: Date = new Date(),
  isPro = false,
): TrialState {
  if (isPro || !createdAt) {
    return { isTrialActive: false, trialDaysLeft: 0, trialEndsAt: null };
  }

  const start = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(start.getTime())) {
    return { isTrialActive: false, trialDaysLeft: 0, trialEndsAt: null };
  }

  const trialEndsAt = new Date(start.getTime() + TRIAL_DAYS * DAY_MS);
  const remainingMs = trialEndsAt.getTime() - now.getTime();
  const trialDaysLeft = Math.max(0, Math.min(TRIAL_DAYS, Math.ceil(remainingMs / DAY_MS)));

  return {
    isTrialActive: remainingMs > 0,
    trialDaysLeft,
    trialEndsAt: trialEndsAt.toISOString(),
  };
}

export function canUseAiScan({
  isPro,
  isTrialActive,
  dailyScansUsed,
  dailyLimit = DAILY_TRIAL_SCAN_LIMIT,
}: ScanAccessInput): boolean {
  return isPro || (isTrialActive && dailyScansUsed < dailyLimit);
}

export function isScanAllowed(input: ScanAccessInput): ScanBlockReason {
  if (canUseAiScan(input)) return 'allowed';
  if (input.isTrialActive) return 'daily_trial_limit';
  return 'subscription_required';
}
