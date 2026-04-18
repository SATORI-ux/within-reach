import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const { key, subscription } = await req.json()

    if (!key || typeof key !== 'string') {
      return json({ error: 'Missing key.' }, 400)
    }

    if (
      !subscription ||
      typeof subscription !== 'object' ||
      typeof subscription.endpoint !== 'string'
    ) {
      return json({ error: 'Missing or invalid subscription.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let resolvedUserSlug: string | null = null
    let tileLookupError: string | null = null
    let sessionLookupError: string | null = null
    let matchedSource: 'tile_keys' | 'device_sessions' | null = null

    const { data: tile, error: tileError } = await supabase
      .from('tile_keys')
      .select('user_slug')
      .eq('tile_key', key)
      .eq('is_active', true)
      .maybeSingle()

    if (tileError) {
      tileLookupError = tileError.message
    }

    if (tile?.user_slug) {
      resolvedUserSlug = tile.user_slug
      matchedSource = 'tile_keys'
    }

    if (!resolvedUserSlug) {
      const { data: session, error: sessionError } = await supabase
        .from('device_sessions')
        .select('user_slug')
        .eq('session_token', key)
        .eq('is_active', true)
        .maybeSingle()

      if (sessionError) {
        sessionLookupError = sessionError.message
      }

      if (session?.user_slug) {
        resolvedUserSlug = session.user_slug
        matchedSource = 'device_sessions'
      }
    }

    if (!resolvedUserSlug) {
      return json(
        {
          error: 'Invalid tile key.',
          debug: {
            received_key: key,
            key_length: key.length,
            tile_lookup_found: !!tile?.user_slug,
            tile_lookup_error: tileLookupError,
            session_lookup_found: matchedSource === 'device_sessions',
            session_lookup_error: sessionLookupError,
          },
        },
        401
      )
    }

    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_slug: resolvedUserSlug,
          endpoint: subscription.endpoint,
          subscription_json: subscription,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (upsertError) {
      return json(
        {
          error: upsertError.message,
          debug: {
            received_key: key,
            matched_source: matchedSource,
            resolved_user_slug: resolvedUserSlug,
          },
        },
        500
      )
    }

    return json({
      ok: true,
      user_slug: resolvedUserSlug,
      matched_source: matchedSource,
    })
  } catch (error) {
    return json({ error: String(error) }, 500)
  }
})