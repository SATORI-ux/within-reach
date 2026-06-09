import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';
import {
  assertPrivatePagesEnabled,
  normalizeEntryId,
  requireSecretEntryManage,
  type SecretEntryRow,
} from '../_shared/secret-page.ts';

type Payload = {
  tile_key?: string;
  entry_id?: string;
};

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    assertPrivatePagesEnabled();

    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const visitor = await validateTileKey(client, body.tile_key ?? '');

    const entryId = normalizeEntryId(body.entry_id);
    if (!entryId) {
      throw new Error('Entry id is required.');
    }

    const { data: existing, error: existingError } = await client
      .from('secret_entries')
      .select('*')
      .eq('id', entryId)
      .eq('is_archived', false)
      .single<SecretEntryRow>();

    if (existingError || !existing) {
      throw new Error(existingError?.message || 'Entry not found.');
    }

    await requireSecretEntryManage(client, visitor, existing);

    const { data, error } = await client
      .from('secret_entries')
      .update({
        is_archived: true,
        updated_by: visitor.user_slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('is_archived', false)
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not archive entry.');
    }

    return json({ ok: true, entry_id: data.id }, 200, { req });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to archive entry.',
    }, 400, { req });
  }
});
