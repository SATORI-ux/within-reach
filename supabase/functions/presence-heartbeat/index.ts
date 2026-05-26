import {
  getAdminClient,
  getCounterpartSlug,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
};

const ACTIVE_WINDOW_SECONDS = 35;

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const visitor = await validateTileKey(client, body.tile_key ?? '');
    const now = new Date();
    const nowIso = now.toISOString();

    const { error: heartbeatError } = await client
      .from('presence_heartbeats')
      .upsert({
        user_slug: visitor.user_slug,
        last_seen_at: nowIso,
        updated_at: nowIso,
      }, { onConflict: 'user_slug' });

    if (heartbeatError) {
      throw new Error(heartbeatError.message);
    }

    const counterpartSlug = getCounterpartSlug(visitor.user_slug);
    let counterpartPresent = false;

    if (counterpartSlug) {
      const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_SECONDS * 1000).toISOString();
      const { data, error } = await client
        .from('presence_heartbeats')
        .select('user_slug')
        .eq('user_slug', counterpartSlug)
        .gte('last_seen_at', activeSince)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      counterpartPresent = Boolean(data);
    }

    return json({
      counterpart_present: counterpartPresent,
      active_window_seconds: ACTIVE_WINDOW_SECONDS,
    }, 200, { req });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Unable to update presence.',
    }, 400, { req });
  }
});
