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
    const { session_token } = await req.json()

    if (!session_token || typeof session_token !== 'string') {
      return json({ error: 'Missing session token.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: session, error: sessionError } = await supabase
      .from('device_sessions')
      .select('id, user_slug')
      .eq('session_token', session_token)
      .eq('is_active', true)
      .single()

    if (sessionError || !session) {
      return json({ error: 'Invalid session token.' }, 401)
    }

    const { data: tile, error: tileError } = await supabase
      .from('tile_keys')
      .select('user_slug, display_name, accent_color')
      .eq('user_slug', session.user_slug)
      .eq('is_active', true)
      .single()

    if (tileError || !tile) {
      return json({ error: 'Could not resolve session user.' }, 404)
    }

    await supabase
      .from('device_sessions')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', session.id)

    return json({
      ok: true,
      user_slug: tile.user_slug,
      display_name: tile.display_name,
      accent_color: tile.accent_color,
    })
  } catch (error) {
    return json({ error: String(error) }, 500)
  }
})