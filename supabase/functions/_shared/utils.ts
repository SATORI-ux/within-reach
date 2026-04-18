import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const ALLOWED_REACTIONS = ['❤️', '✨', '🥹', '🌙', '🐞', '🌸'];

type VisitorRow = {
  user_slug: string;
  display_name: string;
  accent_color: string | null;
  is_active: boolean;
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return null;
}

export function requirePost(req: Request): Response | null {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  return null;
}

export function getAdminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function readJson<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

export async function validateTileKey(
  client: SupabaseClient,
  tileKey: string,
): Promise<VisitorRow> {
  const key = tileKey?.trim();
  if (!key) {
    throw new Error('Missing tile key.');
  }

  const { data, error } = await client
    .from('tile_keys')
    .select('user_slug, display_name, accent_color, is_active')
    .eq('tile_key', key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !data.is_active) {
    throw new Error('That tile key is not active.');
  }

  return data;
}

export function sanitizeNoteContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim();
}

export function createNotificationStub(kind: 'gentle' | 'urgent', fromUserSlug: string) {
  return {
    success: false,
    result: `stub:${kind}:no-provider:${fromUserSlug}`,
  };
}

export async function getReactionsSummary(
  client: SupabaseClient,
  noteIds: number[],
  viewerSlug: string,
) {
  if (!noteIds.length) {
    return new Map<number, Array<{ reaction: string; count: number; users: string[]; reacted_by_viewer: boolean }>>();
  }

  const { data, error } = await client
    .from('note_reactions')
    .select('note_id, reaction, from_user_slug')
    .in('note_id', noteIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<number, Map<string, Set<string>>>();

  for (const row of data ?? []) {
    if (!map.has(row.note_id)) {
      map.set(row.note_id, new Map());
    }

    const reactionsForNote = map.get(row.note_id)!;
    if (!reactionsForNote.has(row.reaction)) {
      reactionsForNote.set(row.reaction, new Set());
    }

    reactionsForNote.get(row.reaction)!.add(row.from_user_slug);
  }

  const summaryMap = new Map<number, Array<{ reaction: string; count: number; users: string[]; reacted_by_viewer: boolean }>>();

  for (const [noteId, reactions] of map.entries()) {
    const summaries = Array.from(reactions.entries()).map(([reaction, usersSet]) => {
      const users = Array.from(usersSet.values());
      return {
        reaction,
        count: users.length,
        users,
        reacted_by_viewer: users.includes(viewerSlug),
      };
    });

    summaryMap.set(noteId, summaries);
  }

  return summaryMap;
}

export function withNoteReactions<T extends { id: number }>(
  notes: T[],
  reactionMap: Map<number, Array<{ reaction: string; count: number; users: string[]; reacted_by_viewer: boolean }>>,
) {
  return notes.map((note) => ({
    ...note,
    reactions: reactionMap.get(note.id) ?? [],
  }));
}
