import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  sendPushToCounterpart,
  validateTileKey,
  type VisitorRow,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
};

type SmsResult = {
  success: boolean;
  result: string;
};

function getCounterpartSlug(userSlug: string): string | null {
  if (userSlug === 'joey') return 'jeszi';
  if (userSlug === 'jeszi') return 'joey';
  return null;
}

async function sendUrgentSmsToCounterpart(client: ReturnType<typeof getAdminClient>, visitor: VisitorRow): Promise<SmsResult> {
  const counterpartSlug = getCounterpartSlug(visitor.user_slug);

  if (!counterpartSlug) {
    return {
      success: false,
      result: `sms:no-counterpart:${visitor.user_slug}`,
    };
  }

  const { data: contact, error: contactError } = await client
    .from('urgent_contacts')
    .select('phone_e164, sms_enabled')
    .eq('user_slug', counterpartSlug)
    .maybeSingle();

  if (contactError) {
    throw new Error(contactError.message);
  }

  if (!contact || !contact.sms_enabled || !contact.phone_e164) {
    return {
      success: false,
      result: `sms:not-enabled:${counterpartSlug}`,
    };
  }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      result: 'sms:missing-provider-config',
    };
  }

  const body = `${visitor.display_name} needs you. Open Within Reach when you can.`;
  const basicAuth = btoa(`${accountSid}:${authToken}`);
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: new URLSearchParams({
      To: contact.phone_e164,
      From: fromNumber,
      Body: body,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    return {
      success: false,
      result: `sms:failed:${response.status}:${responseText}`,
    };
  }

  return {
    success: true,
    result: `sms:sent:${counterpartSlug}`,
  };
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const visitor = await validateTileKey(client, body.tile_key ?? '');

    const pushNotification = await sendPushToCounterpart(
      client,
      visitor,
      'urgent',
      'Can you talk?',
      `${visitor.display_name} needs you.`,
      '/within-reach/'
    );

    const smsNotification = await sendUrgentSmsToCounterpart(client, visitor);

    const notificationSent = pushNotification.success || smsNotification.success;
    const notificationResult = [pushNotification.result, smsNotification.result].join(' | ');

    const { error } = await client.from('urgent_signals').insert({
      from_user_slug: visitor.user_slug,
      notification_sent: notificationSent,
      notification_result: notificationResult,
      confirmed_by_user: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    return json({
      success: true,
      message: 'Signal sent.',
      notification: {
        sent: notificationSent,
        result: notificationResult,
        push: {
          success: pushNotification.success,
          result: pushNotification.result,
          delivered: pushNotification.delivered,
          failed: pushNotification.failed,
          attempted: pushNotification.attempted,
        },
        sms: smsNotification,
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send urgent signal.' }, 400);
  }
});
