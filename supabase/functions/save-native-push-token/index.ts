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
  token?: string;
  platform?: string;
  device_label?: string;
};

function normalizePlatform(value: string | undefined) {
  return value === 'android' ? value : 'android';
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const token = String(body.token || '').trim();

    if (!token) {
      throw new Error('Missing native push token.');
    }

    const visitor = await validateTileKey(client, body.tile_key ?? '');
    const session = await getActiveDeviceSession(client, body.tile_key ?? '');
    const now = new Date().toISOString();

    const { error } = await client
      .from('native_push_tokens')
      .upsert(
        {
          user_slug: visitor.user_slug,
          token,
          platform: normalizePlatform(body.platform),
          device_session_id: session?.id || null,
          device_label: body.device_label || session?.label || 'android',
          is_active: true,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: 'token' },
      );

    if (error) {
      throw new Error(error.message);
    }

    return json({ ok: true }, 200, { req });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to save native push token.' }, 400, { req });
  }
});
