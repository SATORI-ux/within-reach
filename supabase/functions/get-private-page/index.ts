import {
  getAdminClient,
  getThoughtCounts,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';
import { getSecretState } from '../_shared/secret.ts';

type Payload = {
  tile_key?: string;
};

type PrivatePageRow = {
  content: Record<string, unknown> | null;
  updated_at: string | null;
};

function assertPrivatePagesEnabled() {
  if (Deno.env.get('WITHIN_REACH_PRIVATE_PAGES_ENABLED') !== 'true') {
    throw new Error('Private pages are not enabled for this deployment.');
  }
}

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
    const secretState = await getSecretState(client, visitor.user_slug);

    if (!secretState.unlocked) {
      return json({
        unlocked: false,
        updated_at: null,
        content: null,
        thought_counts: [],
      }, 200, { req });
    }

    const { data, error } = await client
      .from('private_pages')
      .select('content, updated_at')
      .eq('user_slug', visitor.user_slug)
      .maybeSingle<PrivatePageRow>();

    if (error) {
      throw new Error(error.message);
    }

    return json({
      unlocked: true,
      updated_at: data?.updated_at ?? null,
      content: data?.content ?? null,
      thought_counts: await getThoughtCounts(client),
    }, 200, { req });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unable to read private page.' },
      400,
      { req },
    );
  }
});
