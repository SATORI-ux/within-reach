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
  getSecretFinalAskForViewer,
  resetSecretFinalAsk,
} from '../_shared/secret-page.ts';

type Payload = {
  tile_key?: string;
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
    const finalAsk = await resetSecretFinalAsk(client, visitor);

    return json({
      ok: true,
      final_ask: getSecretFinalAskForViewer(finalAsk, visitor),
    }, 200, { req });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to reset the Final Ask.',
    }, 400, { req });
  }
});
