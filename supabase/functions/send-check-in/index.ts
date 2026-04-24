import {
  getAdminClient,
  getThoughtCounts,
  assertWriteCooldown,
  getPrivateFeedStateEnabled,
  handleOptions,
  json,
  readJson,
  requirePost,
  sendPushToCounterpart,
  validateTileKey,
} from '../_shared/utils.ts';
import { type SecretState, updateSecretUnlockAfterThought } from '../_shared/secret.ts';

type Payload = {
  tile_key?: string;
  debug_secret_progress?: {
    prior_thought_count?: number;
    first_thought_days_ago?: number;
  };
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
    const includePrivateFeedState = getPrivateFeedStateEnabled();

    await assertWriteCooldown(client, 'check_ins', visitor.user_slug, 15, 'check_in');

    const notification = await sendPushToCounterpart(
      client,
      visitor,
      'gentle',
      'A small check-in arrived.',
      `${visitor.display_name} was thinking of you.`,
    );

    const { data: created, error: insertError } = await client
      .from('check_ins')
      .insert({
        from_user_slug: visitor.user_slug,
        notification_sent: notification.success,
        notification_result: notification.result,
      })
      .select('id, from_user_slug, created_at')
      .single();

    if (insertError || !created) {
      throw new Error(insertError?.message || 'Could not create check-in.');
    }

    const { count, error: countError } = await client
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('from_user_slug', visitor.user_slug);

    if (countError) {
      throw new Error(countError.message);
    }

    let secretState: SecretState = {
      unlocked: false,
      unlocked_at: null,
    };

    try {
      secretState = await updateSecretUnlockAfterThought(
        client,
        visitor.user_slug,
        created.created_at,
        includePrivateFeedState ? body.debug_secret_progress : undefined,
      );
    } catch (secretError) {
      console.error('Secret unlock update failed', {
        user_slug: visitor.user_slug,
        message: secretError instanceof Error ? secretError.message : String(secretError),
      });
    }

    return json({
      total_count: includePrivateFeedState ? count ?? 0 : null,
      thought_counts: includePrivateFeedState ? await getThoughtCounts(client) : [],
      secret_state: includePrivateFeedState ? secretState : null,
      check_in: {
        id: created.id,
        from_user_slug: created.from_user_slug,
        display_name: visitor.display_name,
        accent_color: visitor.accent_color,
        created_at: created.created_at,
      },
      notification: {
        success: notification.success,
        result: notification.result,
        delivered: notification.delivered,
        failed: notification.failed,
        attempted: notification.attempted,
      },
    }, 200, { req });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send check-in.' }, 400, { req });
  }
});
