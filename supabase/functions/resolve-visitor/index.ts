import {
  getActiveDeviceSession,
  getAdminClient,
  getPushEnabledForDevice,
  getPushEnabledForOtherDevices,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
  debug_push?: boolean;
  current_push_endpoint?: string | null;
};

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const visitor = await validateTileKey(client, body.tile_key ?? '');
    const currentSession = await getActiveDeviceSession(client, body.tile_key ?? '');
    const currentPushEndpoint = typeof body.current_push_endpoint === 'string'
      ? body.current_push_endpoint.trim()
      : '';
    const push_enabled = await getPushEnabledForDevice(
      client,
      visitor.user_slug,
      currentPushEndpoint,
    );
    const push_enabled_elsewhere = await getPushEnabledForOtherDevices(
      client,
      visitor.user_slug,
      currentPushEndpoint,
    );
    let push_debug = undefined;

    if (body.debug_push) {
      const { data: subscriptions, error: subscriptionsError } = await client
        .from('push_subscriptions')
        .select('id, endpoint, device_label, device_session_id, updated_at, created_at')
        .eq('user_slug', visitor.user_slug)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (subscriptionsError) {
        throw new Error(subscriptionsError.message);
      }

      push_debug = {
        current_device: currentSession
          ? {
            id: currentSession.id ?? null,
            label: currentSession.label || 'web',
            last_seen_at: currentSession.last_seen_at ?? null,
          }
          : null,
        enabled_devices: (subscriptions ?? []).map((subscription, index) => {
          let endpointHost = 'unknown';

          try {
            endpointHost = new URL(subscription.endpoint).host;
          } catch (_) {}

          return {
            id: subscription.id,
            label: subscription.device_label || `Device ${index + 1}`,
            endpoint_host: endpointHost,
            updated_at: subscription.updated_at ?? subscription.created_at ?? null,
            this_device: currentPushEndpoint
              ? subscription.endpoint === currentPushEndpoint
              : Boolean(currentSession?.id && subscription.device_session_id === currentSession.id),
          };
        }),
      };
    }

    return json({
      user_slug: visitor.user_slug,
      display_name: visitor.display_name,
      accent_color: visitor.accent_color,
      push_enabled,
      push_enabled_elsewhere,
      push_debug,
    }, 200, { req });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to resolve visitor.' }, 400, { req });
  }
});
