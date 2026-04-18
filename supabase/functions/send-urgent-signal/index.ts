import {
  createNotificationStub,
  getAdminClient,
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
    const notification = createNotificationStub('urgent', visitor.user_slug);

    const { error } = await client.from('urgent_signals').insert({
      from_user_slug: visitor.user_slug,
      notification_sent: notification.success,
      notification_result: notification.result,
      confirmed_by_user: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    return json({
      success: true,
      message: 'Signal sent.',
      notification: notification.result,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send urgent signal.' }, 400);
  }
});
