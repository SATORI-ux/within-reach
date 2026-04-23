import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const ALLOWED_REACTIONS = ['❤️', '✨', '🥹', '🌙', '🐞', '🌸'];

export type VisitorRow = {
  user_slug: string;
  display_name: string;
  accent_color: string | null;
  is_active: boolean;
};

export type ThoughtCount = {
  user_slug: string;
  display_name: string;
  accent_color: string | null;
  count: number;
};

type DeviceSessionRow = {
  id?: number;
  user_slug: string;
  session_token?: string;
  label?: string | null;
  is_active: boolean;
  last_seen_at?: string | null;
};

type PushSendResult = {
  success: boolean;
  result: string;
  delivered: number;
  failed: number;
  attempted: number;
};

type PushOptions = {
  data?: Record<string, unknown>;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
};

let vapidConfigured = false;

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

export function getAppBaseUrl(): string {
  const configured = (Deno.env.get('WITHIN_REACH_APP_PATH') || '').trim();
  if (configured) return configured;

  return 'https://within-reach-satori-uxs-projects.vercel.app/';
}

export async function getPushEnabledForUser(
  client: SupabaseClient,
  userSlug: string,
): Promise<boolean> {
  const { count, error } = await client
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_slug', userSlug)
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

export async function getThoughtCounts(client: SupabaseClient): Promise<ThoughtCount[]> {
  const { data: visitors, error: visitorError } = await client
    .from('tile_keys')
    .select('user_slug, display_name, accent_color')
    .eq('is_active', true)
    .order('display_name', { ascending: true });

  if (visitorError) {
    throw new Error(visitorError.message);
  }

  const counts = await Promise.all(
    (visitors ?? []).map(async (visitor) => {
      const { count, error } = await client
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('from_user_slug', visitor.user_slug);

      if (error) {
        throw new Error(error.message);
      }

      return {
        user_slug: visitor.user_slug,
        display_name: visitor.display_name,
        accent_color: visitor.accent_color,
        count: count ?? 0,
      };
    }),
  );

  return counts;
}

export async function readJson<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

async function getActiveTileVisitor(
  client: SupabaseClient,
  key: string,
): Promise<VisitorRow | null> {
  const { data, error } = await client
    .from('tile_keys')
    .select('user_slug, display_name, accent_color, is_active')
    .eq('tile_key', key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !data.is_active) {
    return null;
  }

  return data;
}

async function getVisitorFromSession(
  client: SupabaseClient,
  key: string,
): Promise<VisitorRow | null> {
  const session = await getActiveDeviceSession(client, key);

  if (!session) {
    return null;
  }

  const { data: tile, error: tileError } = await client
    .from('tile_keys')
    .select('user_slug, display_name, accent_color, is_active')
    .eq('user_slug', session.user_slug)
    .maybeSingle();

  if (tileError) {
    throw new Error(tileError.message);
  }

  if (!tile || !tile.is_active) {
    return null;
  }

  return tile;
}

export async function getActiveDeviceSession(
  client: SupabaseClient,
  sessionToken: string,
): Promise<DeviceSessionRow | null> {
  const { data: session, error: sessionError } = await client
    .from('device_sessions')
    .select('id, user_slug, label, is_active, last_seen_at')
    .eq('session_token', sessionToken)
    .maybeSingle<DeviceSessionRow>();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session || !session.is_active) {
    return null;
  }

  return session;
}

export async function resolveVisitorKey(
  client: SupabaseClient,
  visitorKey: string,
): Promise<VisitorRow> {
  const key = visitorKey?.trim();
  if (!key) {
    throw new Error('Missing tile key.');
  }

  const tileVisitor = await getActiveTileVisitor(client, key);
  if (tileVisitor) {
    return tileVisitor;
  }

  const sessionVisitor = await getVisitorFromSession(client, key);
  if (sessionVisitor) {
    return sessionVisitor;
  }

  throw new Error('That tile key is not active.');
}

export async function validateTileKey(
  client: SupabaseClient,
  tileKey: string,
): Promise<VisitorRow> {
  return await resolveVisitorKey(client, tileKey);
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

export function getCounterpartSlug(userSlug: string): string | null {
  if (userSlug === 'joey') return 'jeszi';
  if (userSlug === 'jeszi') return 'joey';
  return null;
}

export async function getTileKeyForUser(
  client: SupabaseClient,
  userSlug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('tile_keys')
    .select('tile_key')
    .eq('user_slug', userSlug)
    .eq('is_active', true)
    .maybeSingle<{ tile_key: string }>();

  if (error) {
    throw new Error(error.message);
  }

  return data?.tile_key ?? null;
}

function generateSessionToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

export async function issueDeviceSessionForUser(
  client: SupabaseClient,
  userSlug: string,
  label: string | null = null,
): Promise<string> {
  const sessionToken = generateSessionToken();
  const now = new Date().toISOString();

  const { error } = await client
    .from('device_sessions')
    .insert({
      user_slug: userSlug,
      session_token: sessionToken,
      label,
      is_active: true,
      created_at: now,
      last_seen_at: now,
    });

  if (error) {
    throw new Error(error.message);
  }

  return sessionToken;
}

function ensureVapidConfigured() {
  if (vapidConfigured) return;

  const subject = Deno.env.get('WEB_PUSH_VAPID_SUBJECT');
  const publicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY');

  if (!subject || !publicKey || !privateKey) {
    throw new Error('Missing WEB_PUSH_VAPID_SUBJECT, WEB_PUSH_VAPID_PUBLIC_KEY, or WEB_PUSH_VAPID_PRIVATE_KEY.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendPushToCounterpart(
  client: SupabaseClient,
  fromVisitor: VisitorRow,
  kind: 'gentle' | 'urgent',
  title: string,
  body: string,
  url = getAppBaseUrl(),
  options: PushOptions = {},
): Promise<PushSendResult> {
  const counterpartSlug = getCounterpartSlug(fromVisitor.user_slug);

  if (!counterpartSlug) {
    return {
      success: false,
      result: `push:${kind}:no-counterpart:${fromVisitor.user_slug}`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  const { data: subscriptions, error } = await client
    .from('push_subscriptions')
    .select('id, endpoint, subscription_json')
    .eq('user_slug', counterpartSlug)
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  if (!subscriptions?.length) {
    return {
      success: false,
      result: `push:${kind}:no-subscriptions:${counterpartSlug}`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  ensureVapidConfigured();

  let delivered = 0;
  let failed = 0;

  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        row.subscription_json,
        JSON.stringify({
          title,
          body,
          tag: options.tag,
          renotify: options.renotify,
          requireInteraction: options.requireInteraction,
          data: {
            url,
            kind,
            from_user_slug: fromVisitor.user_slug,
            ...(options.data || {}),
          },
        }),
        options.urgency ? { urgency: options.urgency } : undefined,
      );
      delivered += 1;
    } catch (pushError) {
      failed += 1;
      console.error('Push send failed', {
        endpoint: row.endpoint,
        message: pushError instanceof Error ? pushError.message : String(pushError),
      });
    }
  }

  return {
    success: delivered > 0,
    result: `push:${kind}:attempted=${subscriptions.length}:delivered=${delivered}:failed=${failed}`,
    delivered,
    failed,
    attempted: subscriptions.length,
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
