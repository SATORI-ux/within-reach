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
  normalizeFinalAskResponse,
  respondSecretFinalAsk,
} from '../_shared/secret-page.ts';
import {
  sendSecretPageNotification,
  type SecretNotificationResult,
} from '../_shared/secret-notification.ts';
import {
  getSecretAlwaysUnlockUserSlug,
  getSecretTargetUserSlug,
} from '../_shared/secret.ts';

type Payload = {
  tile_key?: string;
  response?: string;
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
    const response = normalizeFinalAskResponse(body.response);
    const finalAsk = await respondSecretFinalAsk(client, visitor, response);

    const ownerSlug = getSecretAlwaysUnlockUserSlug();
    const respondentSlug = getSecretTargetUserSlug();

    const notifications: Record<string, SecretNotificationResult> = {};

    if (response === 'yes') {
      notifications.yes_owner = await sendSecretPageNotification(client, {
        type: 'final_ask_yes_owner',
        intendedRecipientSlug: ownerSlug,
        fromUserSlug: respondentSlug,
        kind: 'gentle',
        title: 'She said yes.',
        body: 'Open Within Reach to see her answer.',
        tag: 'final-ask-yes',
        data: { response: 'yes' },
      });

      notifications.yes_respondent = await sendSecretPageNotification(client, {
        type: 'final_ask_yes_respondent',
        intendedRecipientSlug: respondentSlug,
        fromUserSlug: respondentSlug,
        kind: 'gentle',
        title: 'Your answer was saved.',
        body: 'Open Within Reach to see what happens next.',
        tag: 'final-ask-yes-confirm',
        data: { response: 'yes' },
      });
    } else {
      notifications.talk_first_owner = await sendSecretPageNotification(client, {
        type: 'final_ask_talk_first',
        intendedRecipientSlug: ownerSlug,
        fromUserSlug: respondentSlug,
        kind: 'gentle',
        title: 'She wants to talk first.',
        body: 'Open Within Reach to see her answer.',
        tag: 'final-ask-talk-first',
        data: { response: 'talk_first' },
      });
    }

    /*
      Mark production notification flags only when the notification was sent in live mode.

      Important:
      - dry_run must never mark sent flags.
      - reroute must never mark sent flags, even when Joey is both intended and actual recipient.
      - live mode already requires WITHIN_REACH_FINAL_ASK_LIVE_ARMED=true inside the notification safety layer.
    */
    const yesOwnerResult = notifications.yes_owner;
    const talkFirstOwnerResult = notifications.talk_first_owner;

    const shouldMarkYes =
      yesOwnerResult?.mode === 'live' && yesOwnerResult?.sent === true;

    const shouldMarkTalkFirst =
      talkFirstOwnerResult?.mode === 'live' && talkFirstOwnerResult?.sent === true;

    if (shouldMarkYes || shouldMarkTalkFirst) {
      const now = new Date().toISOString();
      const updates: Record<string, string> = { updated_at: now };

      if (shouldMarkYes) {
        updates.yes_notification_sent_at = now;
        finalAsk.yes_notification_sent_at = now;
      }

      if (shouldMarkTalkFirst) {
        updates.talk_first_notification_sent_at = now;
        finalAsk.talk_first_notification_sent_at = now;
      }

      const { error: updateError } = await client
        .from('secret_final_ask')
        .update(updates)
        .eq('id', finalAsk.id);

      if (updateError) {
        console.error('[respond-final-ask] notification flag update failed', {
          message: updateError.message,
        });
      }
    }

    return json({
      ok: true,
      final_ask: getSecretFinalAskForViewer(finalAsk, visitor),
      notifications,
    }, 200, { req });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'Unable to save the Final Ask response.',
    }, 400, { req });
  }
});

