import {
  getAdminClient,
  getPushEnabledForUser,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
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
    const push_enabled = await getPushEnabledForUser(client, visitor.user_slug);

    return json({
      user_slug: visitor.user_slug,
      display_name: visitor.display_name,
      accent_color: visitor.accent_color,
      push_enabled,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to resolve visitor.' }, 400);
  }
});
