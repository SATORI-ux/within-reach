import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  sendPushToCounterpart,
  validateTileKey,
} from '../_shared/utils.ts';
import { updateSecretUnlockAfterThought } from '../_shared/secret.ts';

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

    const notification = await sendPushToCounterpart(
      client,
      visitor,
      'gentle',
      'A small check-in arrived.',
      `${visitor.display_name} was thinking of you.`,
      '/'
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

    let secretState = {
      unlocked: false,
      unlocked_at: null,
    };

    try {
      secretState = await updateSecretUnlockAfterThought(
        client,
        visitor.user_slug,
        created.created_at,
        body.debug_secret_progress,
      );
    } catch (secretError) {
      console.error('Secret unlock update failed', {
        user_slug: visitor.user_slug,
        message: secretError instanceof Error ? secretError.message : String(secretError),
      });

      if (body.debug_secret_progress) {
        secretState = {
          unlocked: false,
          unlocked_at: null,
          debug: {
            requested: true,
            enabled: Deno.env.get('SECRET_DEBUG_UNLOCKS') === 'true',
            target_user_slug: Deno.env.get('SECRET_TARGET_USER_SLUG') || 'jeszi',
            user_slug: visitor.user_slug,
            thought_target: Number(Deno.env.get('SECRET_THOUGHT_TARGET')) || 150,
            minimum_days: Number(Deno.env.get('SECRET_MINIMUM_DAYS')) || 90,
            reason: 'secret-state-error',
          },
        };
      }
    }

    return json({
      total_count: count ?? 0,
      secret_state: secretState,
      debug: body.debug_secret_progress
        ? {
          resolved_user_slug: visitor.user_slug,
          created_check_in_id: created.id,
          counted_user_slug: visitor.user_slug,
          counted_total: count ?? 0,
        }
        : undefined,
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
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send check-in.' }, 400);
  }
});
