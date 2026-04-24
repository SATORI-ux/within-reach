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

function generateSessionToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, req)
  }

  try {
    const { key, label } = await req.json()

    if (!key || typeof key !== 'string') {
      return json({ error: 'Missing tile key.' }, 400, req)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tile, error: tileError } = await supabase
      .from('tile_keys')
      .select('user_slug, display_name, accent_color')
      .eq('tile_key', key)
      .eq('is_active', true)
      .single()

    if (tileError || !tile) {
      return json({ error: 'Invalid tile key.' }, 401, req)
    }

    const sessionToken = generateSessionToken()
    const now = new Date().toISOString()

    const { error: insertError } = await supabase
      .from('device_sessions')
      .insert({
        user_slug: tile.user_slug,
        session_token: sessionToken,
        label: typeof label === 'string' ? label : null,
        is_active: true,
        created_at: now,
        last_seen_at: now,
      })

    if (insertError) {
      return json({ error: insertError.message }, 500, req)
    }

    return json({
      ok: true,
      session_token: sessionToken,
      user_slug: tile.user_slug,
      display_name: tile.display_name,
      accent_color: tile.accent_color,
    }, 200, req)
  } catch (error) {
    return json({ error: String(error) }, 500, req)
  }
})
