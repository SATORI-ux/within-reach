import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { getCounterpartSlug, sendNotificationToCounterpart } from './utils.ts';
import type { VisitorRow } from './utils.ts';

export type SecretNotificationMode = 'dry_run' | 'reroute' | 'live';

export type SecretNotificationResult = {
  mode: SecretNotificationMode;
  notification_type: string;
  intended_recipient_slug: string;
  actual_recipient_slug: string | null;
  sent: boolean;
  rerouted: boolean;
  blocked_reason?: string;
};

type SendSecretNotificationParams = {
  type: string;
  intendedRecipientSlug: string;
  fromUserSlug: string;
  kind: 'gentle' | 'urgent';
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export function getSecretNotificationMode(): SecretNotificationMode {
  const raw = (Deno.env.get('WITHIN_REACH_SECRET_NOTIFICATION_MODE') ?? '').trim().toLowerCase();
  if (raw === 'reroute' || raw === 'live') return raw as SecretNotificationMode;
  return 'dry_run';
}

export function buildBlockedSecretNotificationResult(
  type: string,
  intendedRecipientSlug: string,
  blockedReason: string,
): SecretNotificationResult {
  return {
    mode: getSecretNotificationMode(),
    notification_type: type,
    intended_recipient_slug: intendedRecipientSlug,
    actual_recipient_slug: null,
    sent: false,
    rerouted: false,
    blocked_reason: blockedReason,
  };
}

function getSecretNotificationTestRecipientSlug(): string {
  return (Deno.env.get('WITHIN_REACH_SECRET_NOTIFICATION_TEST_RECIPIENT_SLUG') ?? '').trim();
}

function isFinalAskLiveArmed(): boolean {
  return Deno.env.get('WITHIN_REACH_FINAL_ASK_LIVE_ARMED') === 'true';
}

async function dispatchPushToRecipient(
  client: SupabaseClient,
  recipientSlug: string,
  fromUserSlug: string,
  params: Pick<SendSecretNotificationParams, 'kind' | 'title' | 'body' | 'tag' | 'data'>,
): Promise<boolean> {
  const routingSlug = getCounterpartSlug(recipientSlug);
  if (!routingSlug) {
    console.warn(`[secret-notification] no counterpart mapping for recipient=${recipientSlug}`);
    return false;
  }
  const syntheticFrom: VisitorRow = {
    user_slug: routingSlug,
    display_name: routingSlug,
    accent_color: null,
    is_active: true,
  };
  try {
    const result = await sendNotificationToCounterpart(
      client,
      syntheticFrom,
      params.kind,
      params.title,
      params.body,
      undefined,
      {
        tag: params.tag,
        androidChannelId: 'gentle',
        data: {
          from_user_slug: fromUserSlug,
          type: 'final_ask',
          ...(params.data ?? {}),
        },
      },
    );
    return result.success;
  } catch (error) {
    console.error('[secret-notification] dispatch error', {
      recipientSlug,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function sendSecretPageNotification(
  client: SupabaseClient,
  params: SendSecretNotificationParams,
): Promise<SecretNotificationResult> {
  const mode = getSecretNotificationMode();
  const { type, intendedRecipientSlug } = params;
  console.log('[secret-notification]', JSON.stringify({ mode, type, intended: intendedRecipientSlug }));

  const base = {
    mode,
    notification_type: type,
    intended_recipient_slug: intendedRecipientSlug,
    rerouted: false,
  };

  if (mode === 'dry_run') {
    return {
      ...base,
      actual_recipient_slug: null,
      sent: false,
      blocked_reason: 'dry_run',
    };
  }

  if (mode === 'live') {
    if (!isFinalAskLiveArmed()) {
      return {
        ...base,
        actual_recipient_slug: null,
        sent: false,
        blocked_reason: 'live_not_armed',
      };
    }
    const sent = await dispatchPushToRecipient(client, intendedRecipientSlug, params.fromUserSlug, params);
    return { ...base, actual_recipient_slug: intendedRecipientSlug, sent };
  }

  // reroute mode
  const testSlug = getSecretNotificationTestRecipientSlug();
  if (!testSlug) {
    return {
      ...base,
      actual_recipient_slug: null,
      sent: false,
      blocked_reason: 'reroute_no_test_recipient',
    };
  }
  const rerouted = testSlug !== intendedRecipientSlug;
  const sent = await dispatchPushToRecipient(client, testSlug, params.fromUserSlug, params);
  return { ...base, actual_recipient_slug: testSlug, sent, rerouted };
}
