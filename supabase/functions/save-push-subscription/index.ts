import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { key, subscription } = await req.json()

    if (!key || !subscription?.endpoint) {
      return new Response(JSON.stringify({ error: 'Missing key or subscription.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: tile, error: tileError } = await supabase
      .from('tile_keys')
      .select('user_slug')
      .eq('tile_key', key)
      .eq('is_active', true)
      .single()

    if (tileError || !tile) {
      return new Response(JSON.stringify({ error: 'Invalid tile key.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_slug: tile.user_slug,
          endpoint: subscription.endpoint,
          subscription_json: subscription,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'endpoint' }
      )

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true, user_slug: tile.user_slug }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})