import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type SecretUnlockRow = {
  user_slug: string;
  first_thought_at: string;
  thought_count_at_unlock: number;
  unlocked_at: string;
};

type CheckInProgressRow = {
  created_at: string | null;
};

type ThoughtProgress = {
  thoughtCount: number;
  firstThoughtAt: string | null;
};

type SecretSoftReveal = {
  active: boolean;
  tagline: string;
};

export type SecretState = {
  unlocked: boolean;
  unlocked_at: string | null;
  soft_reveal?: SecretSoftReveal;
  debug?: {
    requested: boolean;
    enabled: boolean;
    target_user_slug: string;
    user_slug: string;
    effective_thought_count?: number;
    first_thought_days_ago?: number;
    thought_target: number;
    minimum_days: number;
    reason: string;
  };
};

type SecretDebugProgress = {
  prior_thought_count?: number;
  first_thought_days_ago?: number;
};

const DEFAULT_SECRET_TARGET_USER_SLUG = 'jeszi';
const DEFAULT_SECRET_ALWAYS_UNLOCK_USER_SLUG = 'joey';
const DEFAULT_SECRET_THOUGHT_TARGET = 150;
const DEFAULT_SECRET_MINIMUM_DAYS = 90;
const SECRET_SOFT_REVEAL_TAGLINE = 'Something in this little place has started keeping your name.';

function getSecretTargetUserSlug(): string {
  return Deno.env.get('SECRET_TARGET_USER_SLUG') || DEFAULT_SECRET_TARGET_USER_SLUG;
}

function getSecretAlwaysUnlockUserSlug(): string {
  return Deno.env.get('SECRET_ALWAYS_UNLOCK_USER_SLUG') ?? DEFAULT_SECRET_ALWAYS_UNLOCK_USER_SLUG;
}

function getSecretThoughtTarget(): number {
  const value = Number(Deno.env.get('SECRET_THOUGHT_TARGET'));
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_SECRET_THOUGHT_TARGET;
  return Math.floor(value);
}

function getSecretMinimumDays(): number {
  const value = Number(Deno.env.get('SECRET_MINIMUM_DAYS'));
  if (!Number.isFinite(value) || value < 0) return DEFAULT_SECRET_MINIMUM_DAYS;
  return Math.floor(value);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

function canUseSecretDebugProgress(debugProgress?: SecretDebugProgress): debugProgress is SecretDebugProgress {
  return Deno.env.get('SECRET_DEBUG_UNLOCKS') === 'true' && Boolean(debugProgress);
}

async function getThoughtProgress(
  client: SupabaseClient,
  userSlug: string,
): Promise<ThoughtProgress> {
  const { count, error: countError } = await client
    .from('check_ins')
    .select('*', { count: 'exact', head: true })
    .eq('from_user_slug', userSlug);

  if (countError) {
    throw new Error(countError.message);
  }

  const { data: firstThought, error: firstError } = await client
    .from('check_ins')
    .select('created_at')
    .eq('from_user_slug', userSlug)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<CheckInProgressRow>();

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    thoughtCount: count ?? 0,
    firstThoughtAt: firstThought?.created_at ?? null,
  };
}

function hasMetSecretThresholds(
  progress: ThoughtProgress,
  thoughtTarget: number,
  minimumDays: number,
  now = new Date(),
): boolean {
  if (progress.thoughtCount < thoughtTarget || !progress.firstThoughtAt) return false;

  const eligibleAt = addDays(new Date(progress.firstThoughtAt), minimumDays);
  return now >= eligibleAt;
}

function getSecretSoftReveal(progress: ThoughtProgress, thoughtTarget: number): SecretSoftReveal | undefined {
  if (progress.thoughtCount < thoughtTarget) return undefined;

  return {
    active: true,
    tagline: SECRET_SOFT_REVEAL_TAGLINE,
  };
}

export async function getSecretState(
  client: SupabaseClient,
  userSlug: string,
): Promise<SecretState> {
  if (userSlug === getSecretAlwaysUnlockUserSlug()) {
    return {
      unlocked: true,
      unlocked_at: null,
    };
  }

  if (userSlug !== getSecretTargetUserSlug()) {
    return {
      unlocked: false,
      unlocked_at: null,
    };
  }

  const thoughtTarget = getSecretThoughtTarget();
  const progress = await getThoughtProgress(client, userSlug);
  const softReveal = getSecretSoftReveal(progress, thoughtTarget);
  const unlockedByThresholds = hasMetSecretThresholds(
    progress,
    thoughtTarget,
    getSecretMinimumDays(),
  );

  if (!unlockedByThresholds) {
    return {
      unlocked: false,
      unlocked_at: null,
      soft_reveal: softReveal,
    };
  }

  const { data, error } = await client
    .from('secret_unlocks')
    .select('unlocked_at')
    .eq('user_slug', userSlug)
    .maybeSingle<Pick<SecretUnlockRow, 'unlocked_at'>>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    unlocked: true,
    unlocked_at: data?.unlocked_at ?? null,
    soft_reveal: softReveal,
  };
}

export async function updateSecretUnlockAfterThought(
  client: SupabaseClient,
  userSlug: string,
  createdAt: string,
  debugProgress?: SecretDebugProgress,
): Promise<SecretState> {
  const debugRequested = Boolean(debugProgress);
  const debugEnabled = Deno.env.get('SECRET_DEBUG_UNLOCKS') === 'true';
  const targetUserSlug = getSecretTargetUserSlug();
  const thoughtTarget = getSecretThoughtTarget();
  const minimumDays = getSecretMinimumDays();
  const debugPriorThoughtCount = Number(debugProgress?.prior_thought_count);
  const debugFirstThoughtDaysAgo = Number(debugProgress?.first_thought_days_ago);
  const requestedDebugThoughtCount = debugRequested
    ? Math.max(0, Math.floor(Number.isFinite(debugPriorThoughtCount) ? debugPriorThoughtCount : 0)) + 1
    : undefined;
  const requestedDebugDaysAgo = debugRequested
    ? Math.max(0, Math.floor(Number.isFinite(debugFirstThoughtDaysAgo) ? debugFirstThoughtDaysAgo : 0))
    : undefined;
  const buildDebugState = (
    state: SecretState,
    reason: string,
    details: Partial<NonNullable<SecretState['debug']>> = {},
  ): SecretState => {
    if (!debugRequested) return state;

    return {
      ...state,
      debug: {
        requested: true,
        enabled: debugEnabled,
        target_user_slug: targetUserSlug,
        user_slug: userSlug,
        effective_thought_count: requestedDebugThoughtCount,
        first_thought_days_ago: requestedDebugDaysAgo,
        thought_target: thoughtTarget,
        minimum_days: minimumDays,
        reason,
        ...details,
      },
    };
  };

  if (userSlug !== targetUserSlug) {
    return buildDebugState(
      {
        unlocked: false,
        unlocked_at: null,
      },
      'wrong-target-user',
    );
  }

  const existingState = await getSecretState(client, userSlug);
  if (existingState.unlocked && existingState.unlocked_at) return buildDebugState(existingState, 'already-unlocked');

  const usingDebugProgress = canUseSecretDebugProgress(debugProgress);
  let thoughtCount: number;
  let firstThoughtAt: string | null = null;

  if (usingDebugProgress) {
    thoughtCount = requestedDebugThoughtCount ?? 1;
    firstThoughtAt = subtractDays(new Date(createdAt), requestedDebugDaysAgo ?? 0).toISOString();
  } else {
    const progress = await getThoughtProgress(client, userSlug);
    thoughtCount = progress.thoughtCount;
    firstThoughtAt = progress.firstThoughtAt;
  }

  if (debugRequested && !debugEnabled) {
    return buildDebugState(existingState, 'debug-env-disabled', {
      effective_thought_count: thoughtCount,
    });
  }

  if (thoughtCount < thoughtTarget) {
    return buildDebugState(existingState, 'below-thought-target', {
      effective_thought_count: thoughtCount,
    });
  }

  if (!firstThoughtAt) {
    return buildDebugState(existingState, 'missing-first-thought', {
      effective_thought_count: thoughtCount,
    });
  }

  const eligibleAt = addDays(new Date(firstThoughtAt), minimumDays);
  const currentThoughtAt = new Date(createdAt);

  if (currentThoughtAt < eligibleAt) {
    return buildDebugState({
      ...existingState,
      soft_reveal: {
        active: true,
        tagline: SECRET_SOFT_REVEAL_TAGLINE,
      },
    }, 'below-minimum-days', {
      effective_thought_count: thoughtCount,
    });
  }

  const { data: unlocked, error: unlockError } = await client
    .from('secret_unlocks')
    .upsert({
      user_slug: userSlug,
      first_thought_at: firstThoughtAt,
      thought_count_at_unlock: thoughtCount,
      unlocked_at: createdAt,
      updated_at: createdAt,
    }, { onConflict: 'user_slug' })
    .select('unlocked_at')
    .single<Pick<SecretUnlockRow, 'unlocked_at'>>();

  if (unlockError) {
    throw new Error(unlockError.message);
  }

  return buildDebugState(
    {
      unlocked: Boolean(unlocked?.unlocked_at),
      unlocked_at: unlocked?.unlocked_at ?? null,
      soft_reveal: {
        active: true,
        tagline: SECRET_SOFT_REVEAL_TAGLINE,
      },
    },
    'unlocked',
    {
      effective_thought_count: thoughtCount,
    },
  );
}
