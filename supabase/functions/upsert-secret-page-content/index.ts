import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';
import {
  SECRET_PAGE_SLUG,
  assertPrivatePagesEnabled,
  normalizeSecretPageContent,
  requireSecretFixedContentEdit,
} from '../_shared/secret-page.ts';

type Payload = {
  tile_key?: string;
  content?: Record<string, unknown>;
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
    await requireSecretFixedContentEdit(client, visitor);

    const now = new Date().toISOString();
    const content = normalizeSecretPageContent(body.content);

    const { data, error } = await client
      .from('secret_page_content')
      .upsert({
        page_slug: SECRET_PAGE_SLUG,
        content,
        created_by: visitor.user_slug,
        updated_by: visitor.user_slug,
        updated_at: now,
      }, { onConflict: 'page_slug' })
      .select('page_slug, content, updated_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not save page content.');
    }

    return json({
      ok: true,
      content: normalizeSecretPageContent(data.content),
      updated_at: data.updated_at,
    }, 200, { req });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to save page content.',
    }, 400, { req });
  }
});
