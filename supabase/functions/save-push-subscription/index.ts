import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function getConfiguredAllowedOrigins(): string[] {
  return [
    Deno.env.get('WITHIN_REACH_APP_URL'),
    Deno.env.get('WITHIN_REACH_ALLOWED_ORIGINS'),
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin
      } catch (_) {
        return value.replace(/\/$/, '')
      }
    })
}

function getCorsHeaders(req?: Request): Record<string, string> {
  const allowedOrigins = new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...getConfiguredAllowedOrigins(),
  ])
  const origin = req?.headers.get('origin') || ''
  const allowOrigin = origin && allowedOrigins.has(origin)
    ? origin
    : getConfiguredAllowedOrigins()[0] || DEFAULT_ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function json(data: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, req)
  }

  try {
    const { key, subscription } = await req.json()

    if (!key || typeof key !== 'string') {
      return json({ error: 'Missing key.' }, 400, req)
    }

    if (
      !subscription ||
      typeof subscription !== 'object' ||
      typeof subscription.endpoint !== 'string'
    ) {
      return json({ error: 'Missing or invalid subscription.' }, 400, req)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let resolvedUserSlug: string | null = null
    let tileLookupError: string | null = null
    let sessionLookupError: string | null = null
    let matchedSource: 'tile_keys' | 'device_sessions' | null = null
    let matchedSessionId: number | null = null
    let matchedDeviceLabel: string | null = null

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
        .select('id, user_slug, label, expires_at')
        .eq('session_token', key)
        .eq('is_active', true)
        .maybeSingle()

      if (sessionError) {
        sessionLookupError = sessionError.message
      }

      if (session?.expires_at && new Date(session.expires_at) <= new Date()) {
        await supabase
          .from('device_sessions')
          .update({ is_active: false })
          .eq('id', session.id)
      } else if (session?.user_slug) {
        resolvedUserSlug = session.user_slug
        matchedSource = 'device_sessions'
        matchedSessionId = typeof session.id === 'number' ? session.id : null
        matchedDeviceLabel = typeof session.label === 'string' ? session.label : null
      }
    }

    if (!resolvedUserSlug) {
      console.error('Push subscription key lookup failed', {
        tile_lookup_error: tileLookupError,
        session_lookup_error: sessionLookupError,
      })

      return json({ error: 'Invalid session.' }, 401, req)
    }

    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_slug: resolvedUserSlug,
          endpoint: subscription.endpoint,
          subscription_json: subscription,
          device_session_id: matchedSessionId,
          device_label: matchedDeviceLabel,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (upsertError) {
      console.error('Push subscription upsert failed', {
        matched_source: matchedSource,
        resolved_user_slug: resolvedUserSlug,
        message: upsertError.message,
      })

      return json({ error: 'Could not save that subscription.' }, 500, req)
    }

    return json({ ok: true }, 200, req)
  } catch (error) {
    return json({ error: String(error) }, 500, req)
  }
})
