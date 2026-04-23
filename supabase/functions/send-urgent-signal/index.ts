import {
  getCounterpartSlug,
  getAdminClient,
  getAppBaseUrl,
  handleOptions,
  issueDeviceSessionForUser,
  json,
  readJson,
  requirePost,
  sendPushToCounterpart,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
  preferred_response?: string;
};

type PreferredResponse = 'call' | 'text' | 'either';

function normalizePreferredResponse(value: string | undefined): PreferredResponse {
  if (value === 'call' || value === 'text' || value === 'either') return value;
  return 'either';
}

function buildUrgentUrl(basePath: string, recipientSessionToken: string, signalId: string): string {
  const url = new URL(basePath, getAppBaseUrl());
  url.searchParams.set('session', recipientSessionToken);
  url.searchParams.set('urgent', '1');
  url.searchParams.set('signal', signalId);

  return url.href;
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
    const preferredResponse = normalizePreferredResponse(body.preferred_response);
    const counterpartSlug = getCounterpartSlug(visitor.user_slug);

    if (!counterpartSlug) {
      throw new Error('No counterpart is configured for this signal.');
    }

    const recipientSessionToken = await issueDeviceSessionForUser(client, counterpartSlug, 'urgent-link');

    const { data: created, error: insertError } = await client
      .from('urgent_signals')
      .insert({
        from_user_slug: visitor.user_slug,
        preferred_response: preferredResponse,
        confirmed_by_user: true,
        status: 'pending',
      })
      .select('signal_id, from_user_slug, preferred_response, status, created_at')
      .single();

    if (insertError || !created) {
      throw new Error(insertError?.message || 'Could not create urgent signal.');
    }

    const appPath = getAppBaseUrl();
    const urgentUrl = buildUrgentUrl(appPath, recipientSessionToken, created.signal_id);

    const pushNotification = await sendPushToCounterpart(
      client,
      visitor,
      'urgent',
      'Within Reach',
      `${visitor.display_name} needs you. Open Within Reach when you can.`,
      urgentUrl,
      {
        tag: 'urgent-signal',
        renotify: true,
        requireInteraction: true,
        urgency: 'high',
        data: {
          type: 'urgent_signal',
          signalId: created.signal_id,
          preferredResponse,
          requiresAck: true,
        },
      },
    );

    const notificationSent = pushNotification.success;
    const notificationResult = pushNotification.result;

    const { error: updateError } = await client
      .from('urgent_signals')
      .update({
        notification_sent: notificationSent,
        notification_result: notificationResult,
      })
      .eq('signal_id', created.signal_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return json({
      ok: true,
      signal: {
        signal_id: created.signal_id,
        from_user_slug: created.from_user_slug,
        from_display_name: visitor.display_name,
        preferred_response: created.preferred_response,
        status: created.status,
        created_at: created.created_at,
      },
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
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send urgent signal.' }, 400);
  }
});
