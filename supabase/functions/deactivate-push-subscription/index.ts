import {
  getActiveDeviceSession,
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
  endpoint?: string | null;
};

type DeactivatedRow = {
  id: number;
};

async function deactivateByEndpoint(
  client: ReturnType<typeof getAdminClient>,
  userSlug: string,
  endpoint: string,
): Promise<DeactivatedRow[]> {
  const { data, error } = await client
    .from('push_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_slug', userSlug)
    .eq('endpoint', endpoint)
    .eq('is_active', true)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function deactivateByDeviceSession(
  client: ReturnType<typeof getAdminClient>,
  userSlug: string,
  deviceSessionId: number,
): Promise<DeactivatedRow[]> {
  const { data, error } = await client
    .from('push_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_slug', userSlug)
    .eq('device_session_id', deviceSessionId)
    .eq('is_active', true)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
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
    const session = await getActiveDeviceSession(client, body.tile_key ?? '');
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
    const touchedIds = new Set<number>();

    if (endpoint) {
      const rows = await deactivateByEndpoint(client, visitor.user_slug, endpoint);
      rows.forEach((row) => touchedIds.add(row.id));
    }

    if (session?.id) {
      const rows = await deactivateByDeviceSession(client, visitor.user_slug, Number(session.id));
      rows.forEach((row) => touchedIds.add(row.id));
    }

    return json({
      ok: true,
      deactivated: touchedIds.size,
      matched_device_session: Boolean(session?.id),
    }, 200, { req });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Unable to refresh notification state.',
    }, 400, { req });
  }
});
