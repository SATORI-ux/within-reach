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

type UrgentSignalRow = {
  signal_id: string;
  from_user_slug: string;
  preferred_response: 'call' | 'text' | 'either';
  created_at: string;
  status: 'pending' | 'acknowledged';
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  tile_keys: {
    display_name: string;
  } | null;
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

    const { data: signal, error } = await client
      .from('urgent_signals')
      .select(`
        signal_id,
        from_user_slug,
        preferred_response,
        created_at,
        status,
        acknowledged_at,
        acknowledged_by,
        tile_keys!urgent_signals_from_user_slug_fkey(display_name)
      `)
      .eq('signal_id', signalId)
      .maybeSingle<UrgentSignalRow>();

    if (error) {
      throw new Error(error.message);
    }

    if (!signal) {
      throw new Error('That urgent signal could not be found.');
    }

    const intendedRecipient = getCounterpartSlug(signal.from_user_slug);
    if (visitor.user_slug !== intendedRecipient) {
      throw new Error('This urgent signal is not for this visitor.');
    }

    const { data: contact, error: contactError } = await client
      .from('urgent_contacts')
      .select('phone_e164')
      .eq('user_slug', signal.from_user_slug)
      .maybeSingle<{ phone_e164: string | null }>();

    const contactPhone = contactError ? null : contact?.phone_e164 ?? null;

    return json({
      ok: true,
      signal: {
        signal_id: signal.signal_id,
        type: 'urgent_signal',
        from_user_slug: signal.from_user_slug,
        from_display_name: signal.tile_keys?.display_name || signal.from_user_slug,
        preferred_response: signal.preferred_response,
        message_variant: 'needs_you',
        requires_ack: true,
        created_at: signal.created_at,
        status: signal.status,
        acknowledged_at: signal.acknowledged_at,
        acknowledged_by: signal.acknowledged_by,
        contact_phone: contactPhone,
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to read urgent signal.' }, 400);
  }
});
