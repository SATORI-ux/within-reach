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

function generateSessionToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const { key, label } = await req.json()

    if (!key || typeof key !== 'string') {
      return json({ error: 'Missing tile key.' }, 400)
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
      return json({ error: 'Invalid tile key.' }, 401)
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
      return json({ error: insertError.message }, 500)
    }

    return json({
      ok: true,
      session_token: sessionToken,
      user_slug: tile.user_slug,
      display_name: tile.display_name,
      accent_color: tile.accent_color,
    })
  } catch (error) {
    return json({ error: String(error) }, 500)
  }
})