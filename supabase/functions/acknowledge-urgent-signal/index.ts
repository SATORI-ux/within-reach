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
  signal_id?: string;
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
    const signalId = body.signal_id?.trim();

    if (!signalId) {
      throw new Error('Missing urgent signal id.');
    }

    const { data: current, error: readError } = await client
      .from('urgent_signals')
      .select('signal_id, from_user_slug')
      .eq('signal_id', signalId)
      .maybeSingle<{ signal_id: string; from_user_slug: string }>();

    if (readError) {
      throw new Error(readError.message);
    }

    if (!current) {
      throw new Error('That urgent signal could not be found.');
    }

    const intendedRecipient = getCounterpartSlug(current.from_user_slug);
    if (visitor.user_slug !== intendedRecipient) {
      throw new Error('This urgent signal is not for this visitor.');
    }

    const { data: updated, error: updateError } = await client
      .from('urgent_signals')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: visitor.user_slug,
      })
      .eq('signal_id', signalId)
      .select('signal_id, status, acknowledged_at, acknowledged_by')
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message || 'Could not acknowledge urgent signal.');
    }

    return json({
      ok: true,
      signal: updated,
    }, 200, { req });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to acknowledge urgent signal.' }, 400, { req });
  }
});
