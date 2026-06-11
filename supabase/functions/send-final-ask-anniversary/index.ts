import {
  getAdminClient,
  handleOptions,
  json,
  requirePost,
} from '../_shared/utils.ts';
import {
  assertPrivatePagesEnabled,
  getSecretFinalAskNotificationCopy,
  getSecretFinalAskState,
  type SecretFinalAskRow,
} from '../_shared/secret-page.ts';
import {
  buildBlockedSecretNotificationResult,
  getSecretNotificationMode,
  type SecretNotificationResult,
  sendSecretPageNotification,
} from '../_shared/secret-notification.ts';
import {
  getSecretAlwaysUnlockUserSlug,
  getSecretTargetUserSlug,
} from '../_shared/secret.ts';

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

type AnniversaryCheck =
  | { due: true; year: number; time_zone: string }
  | { due: false; reason: string; year?: number; time_zone?: string };

const DEFAULT_ANNIVERSARY_TIME_ZONE = 'UTC';

function getCronSecret(): string {
  return (Deno.env.get('WITHIN_REACH_FINAL_ASK_ANNIVERSARY_CRON_SECRET') ?? '')
    .trim();
}

function getBearerToken(req: Request): string {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function requireCronAuthorization(req: Request): void {
  const expected = getCronSecret();
  if (!expected) {
    throw new Error('Missing anniversary cron secret.');
  }

  if (getBearerToken(req) !== expected) {
    throw new Error('Anniversary cron request is not authorized.');
  }
}

function isFinalAskLiveArmed(): boolean {
  return Deno.env.get('WITHIN_REACH_FINAL_ASK_LIVE_ARMED') === 'true';
}

function normalizeTimeZone(value: string | null): string | null {
  const timeZone = (value || DEFAULT_ANNIVERSARY_TIME_ZONE).trim();

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return timeZone;
  } catch (_) {
    return null;
  }
}

function getLocalDateParts(date: Date, timeZone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getAnniversaryDateForYear(
  accepted: LocalDateParts,
  year: number,
): Pick<LocalDateParts, 'month' | 'day'> {
  if (accepted.month === 2 && accepted.day === 29 && !isLeapYear(year)) {
    return { month: 2, day: 28 };
  }

  return { month: accepted.month, day: accepted.day };
}

function getAnniversaryCheck(
  finalAsk: SecretFinalAskRow,
  now: Date,
): AnniversaryCheck {
  if (!finalAsk.id) return { due: false, reason: 'missing_final_ask' };
  if (finalAsk.status !== 'answered' || finalAsk.response !== 'yes') {
    return { due: false, reason: 'not_accepted' };
  }
  if (!finalAsk.accepted_at) {
    return { due: false, reason: 'missing_accepted_at' };
  }
  if (!finalAsk.anniversary_enabled) {
    return { due: false, reason: 'anniversary_disabled' };
  }

  const timeZone = normalizeTimeZone(finalAsk.anniversary_timezone);
  if (!timeZone) return { due: false, reason: 'invalid_anniversary_timezone' };

  const acceptedAt = new Date(finalAsk.accepted_at);
  if (Number.isNaN(acceptedAt.getTime())) {
    return { due: false, reason: 'invalid_accepted_at', time_zone: timeZone };
  }

  const today = getLocalDateParts(now, timeZone);
  const accepted = getLocalDateParts(acceptedAt, timeZone);
  const anniversary = getAnniversaryDateForYear(accepted, today.year);

  if (today.year <= accepted.year) {
    return {
      due: false,
      reason: 'accepted_this_year',
      year: today.year,
      time_zone: timeZone,
    };
  }

  if (finalAsk.last_anniversary_sent_for_year === today.year) {
    return {
      due: false,
      reason: 'already_sent_for_year',
      year: today.year,
      time_zone: timeZone,
    };
  }

  if (today.month !== anniversary.month || today.day !== anniversary.day) {
    return {
      due: false,
      reason: 'not_anniversary_date',
      year: today.year,
      time_zone: timeZone,
    };
  }

  return { due: true, year: today.year, time_zone: timeZone };
}

async function claimAnniversaryYear(
  client: ReturnType<typeof getAdminClient>,
  finalAsk: SecretFinalAskRow,
  year: number,
): Promise<SecretFinalAskRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from('secret_final_ask')
    .update({
      last_anniversary_sent_for_year: year,
      updated_at: now,
    })
    .eq('id', finalAsk.id)
    .eq('status', 'answered')
    .eq('response', 'yes')
    .eq('anniversary_enabled', true)
    .eq('accepted_at', finalAsk.accepted_at)
    .or(
      `last_anniversary_sent_for_year.is.null,last_anniversary_sent_for_year.neq.${year}`,
    )
    .select('*')
    .maybeSingle<SecretFinalAskRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    assertPrivatePagesEnabled();
    requireCronAuthorization(req);

    const client = getAdminClient();
    const finalAsk = await getSecretFinalAskState(client);
    const check = getAnniversaryCheck(finalAsk, new Date());

    if (!check.due) {
      return json({ ok: true, sent: false, ...check }, 200, { req });
    }

    const copy = await getSecretFinalAskNotificationCopy(
      client,
      [
        'final_ask.anniversary_push_title',
        'final_ask_anniversary_push_title',
      ],
      [
        'final_ask.anniversary_push_body',
        'final_ask_anniversary_push_body',
      ],
    );

    if (!copy) {
      return json(
        {
          ok: true,
          sent: false,
          year: check.year,
          time_zone: check.time_zone,
          reason: 'missing_protected_anniversary_copy',
        },
        200,
        { req },
      );
    }

    const ownerSlug = getSecretAlwaysUnlockUserSlug();
    const respondentSlug = getSecretTargetUserSlug();
    const notificationMode = getSecretNotificationMode();
    const notifications: Record<string, SecretNotificationResult> = {};

    if (notificationMode !== 'live' || !isFinalAskLiveArmed()) {
      const blockedReason = notificationMode === 'live'
        ? 'live_not_armed'
        : `notification_mode_${notificationMode}`;

      notifications.owner = buildBlockedSecretNotificationResult(
        'final_ask_anniversary_owner',
        ownerSlug,
        blockedReason,
      );
      notifications.respondent = buildBlockedSecretNotificationResult(
        'final_ask_anniversary_respondent',
        respondentSlug,
        blockedReason,
      );

      return json(
        {
          ok: true,
          sent: false,
          year: check.year,
          time_zone: check.time_zone,
          reason: blockedReason,
          notifications,
        },
        200,
        { req },
      );
    }

    // Claim before dispatch so repeated cron invocations cannot send duplicates for the same year.
    const claimed = await claimAnniversaryYear(client, finalAsk, check.year);
    if (!claimed) {
      return json(
        {
          ok: true,
          sent: false,
          year: check.year,
          time_zone: check.time_zone,
          reason: 'already_claimed_for_year',
        },
        200,
        { req },
      );
    }

    notifications.owner = ownerSlug
      ? await sendSecretPageNotification(client, {
        type: 'final_ask_anniversary_owner',
        intendedRecipientSlug: ownerSlug,
        fromUserSlug: respondentSlug,
        kind: 'gentle',
        title: copy.title,
        body: copy.body,
        tag: `final-ask-anniversary-${check.year}`,
        data: {
          response: 'yes',
          anniversary_year: check.year,
          accepted_at: claimed.accepted_at,
        },
      })
      : buildBlockedSecretNotificationResult(
        'final_ask_anniversary_owner',
        ownerSlug,
        'missing_owner_slug',
      );

    notifications.respondent = respondentSlug
      ? await sendSecretPageNotification(client, {
        type: 'final_ask_anniversary_respondent',
        intendedRecipientSlug: respondentSlug,
        fromUserSlug: ownerSlug,
        kind: 'gentle',
        title: copy.title,
        body: copy.body,
        tag: `final-ask-anniversary-${check.year}`,
        data: {
          response: 'yes',
          anniversary_year: check.year,
          accepted_at: claimed.accepted_at,
        },
      })
      : buildBlockedSecretNotificationResult(
        'final_ask_anniversary_respondent',
        respondentSlug,
        'missing_respondent_slug',
      );

    return json(
      {
        ok: true,
        sent: Object.values(notifications).some((notification) =>
          notification.sent
        ),
        year: check.year,
        time_zone: check.time_zone,
        last_anniversary_sent_for_year: check.year,
        notifications,
      },
      200,
      { req },
    );
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error
          ? error.message
          : 'Unable to send the Final Ask anniversary reminder.',
      },
      400,
      { req },
    );
  }
});
