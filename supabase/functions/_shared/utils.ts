import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

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
        return new URL(value).origin;
      } catch (_) {
        return value.replace(/\/$/, '');
      }
    });
}

function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...getConfiguredAllowedOrigins(),
  ]);

  return allowedOrigins.has(origin);
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || '';
  const allowOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : getConfiguredAllowedOrigins()[0] || DEFAULT_ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

export const corsHeaders = {
  ...getCorsHeaders(),
};

export type JsonOptions = {
  req?: Request;
};

const RATE_LIMIT_MESSAGES: Record<string, string> = {
  check_in: 'Give that little signal a moment before sending another.',
  note: 'Give the note a moment before sending another.',
  urgent: 'Give that private signal a little room before sending another.',
};

export async function assertWriteCooldown(
  client: SupabaseClient,
  table: string,
  userSlug: string,
  seconds: number,
  label: keyof typeof RATE_LIMIT_MESSAGES,
): Promise<void> {
  const since = new Date(Date.now() - seconds * 1000).toISOString();
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('from_user_slug', userSlug)
    .gte('created_at', since);

  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) > 0) {
    throw new Error(RATE_LIMIT_MESSAGES[label] || 'Give that a moment before trying again.');
  }
}

export function getPrivateFeedStateEnabled(): boolean {
  return Deno.env.get('WITHIN_REACH_PRIVATE_FEED_STATE_ENABLED') === 'true';
}

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
  expires_at?: string | null;
};

type PushSendResult = {
  success: boolean;
  result: string;
  delivered: number;
  failed: number;
  attempted: number;
};

type NotificationSendResult = PushSendResult & {
  channel: 'native' | 'web' | 'none';
};

type PushOptions = {
  data?: Record<string, unknown>;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  androidChannelId?: 'gentle' | 'urgent';
  webUrl?: string;
  excludeDeviceSessionIds?: number[];
};

let vapidConfigured = false;
let firebaseAccessToken: { token: string; expiresAt: number } | null = null;
const APP_BASE_URL_ENV = 'WITHIN_REACH_APP_URL';
const LEGACY_APP_BASE_URL_ENV = 'WITHIN_REACH_APP_PATH';

export function json(data: unknown, status = 200, options: JsonOptions = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: getCorsHeaders(options.req),
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  return null;
}

export function requirePost(req: Request): Response | null {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, { req });
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
  const configured =
    Deno.env.get(APP_BASE_URL_ENV)?.trim() ||
    Deno.env.get(LEGACY_APP_BASE_URL_ENV)?.trim();

  if (!configured) {
    throw new Error(`Missing ${APP_BASE_URL_ENV}. Set it to the canonical Within Reach app URL.`);
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch (_) {
    throw new Error(`${APP_BASE_URL_ENV} must be an absolute http(s) URL.`);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${APP_BASE_URL_ENV} must use http or https.`);
  }

  return url.href;
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

export async function getPushEnabledForDevice(
  client: SupabaseClient,
  userSlug: string,
  endpoint: string | null | undefined,
): Promise<boolean> {
  const trimmedEndpoint = endpoint?.trim();
  if (!trimmedEndpoint) return false;

  const { count, error } = await client
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_slug', userSlug)
    .eq('endpoint', trimmedEndpoint)
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

export async function getPushEnabledForOtherDevices(
  client: SupabaseClient,
  userSlug: string,
  endpoint: string | null | undefined,
): Promise<boolean> {
  const trimmedEndpoint = endpoint?.trim();

  if (!trimmedEndpoint) {
    return await getPushEnabledForUser(client, userSlug);
  }

  const { count, error } = await client
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_slug', userSlug)
    .eq('is_active', true)
    .neq('endpoint', trimmedEndpoint);

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
    .select('id, user_slug, label, is_active, last_seen_at, expires_at')
    .eq('session_token', sessionToken)
    .maybeSingle<DeviceSessionRow>();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session || !session.is_active) {
    return null;
  }

  if (session.expires_at && new Date(session.expires_at) <= new Date()) {
    await client
      .from('device_sessions')
      .update({ is_active: false })
      .eq('id', session.id);
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
  maxAgeSeconds: number | null = null,
): Promise<string> {
  const sessionToken = generateSessionToken();
  const now = new Date().toISOString();
  const expiresAt = maxAgeSeconds && maxAgeSeconds > 0
    ? new Date(Date.now() + maxAgeSeconds * 1000).toISOString()
    : null;

  const { error } = await client
    .from('device_sessions')
    .insert({
      user_slug: userSlug,
      session_token: sessionToken,
      label,
      is_active: true,
      created_at: now,
      last_seen_at: now,
      expires_at: expiresAt,
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

function getFirebaseConfig() {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')?.trim();
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')?.trim();
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n').trim();

  if (!projectId || !clientEmail || !privateKey) return null;

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function createFirebaseJwt(config: NonNullable<ReturnType<typeof getFirebaseConfig>>) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const payload = {
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(config.privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function getFirebaseAccessToken() {
  if (firebaseAccessToken && firebaseAccessToken.expiresAt > Date.now() + 60_000) {
    return firebaseAccessToken.token;
  }

  const config = getFirebaseConfig();
  if (!config) return null;

  const assertion = await createFirebaseJwt(config);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = await response.json();

  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error_description || body?.error || 'Could not authenticate with Firebase.');
  }

  firebaseAccessToken = {
    token: body.access_token,
    expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000,
  };

  return firebaseAccessToken.token;
}

function stringifyFcmData(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

function getPushErrorStatus(error: unknown): number | null {
  const statusCode = (error as { statusCode?: unknown })?.statusCode;
  const status = (error as { status?: unknown })?.status;
  const value = typeof statusCode === 'number' ? statusCode : status;

  return typeof value === 'number' ? value : null;
}

function isPermanentWebPushError(error: unknown): boolean {
  const status = getPushErrorStatus(error);

  return status === 404 || status === 410;
}

function getFcmErrorCode(responseBody: unknown): string {
  const error = (responseBody as { error?: { status?: string; details?: Array<{ errorCode?: string }> } })?.error;
  const detailCode = error?.details?.find((detail) => typeof detail?.errorCode === 'string')?.errorCode;

  return detailCode || '';
}

function isPermanentNativePushError(status: number, responseBody: unknown): boolean {
  const errorCode = getFcmErrorCode(responseBody);

  return status === 404 || errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT';
}

async function deactivateWebPushSubscription(
  client: SupabaseClient,
  id: number,
  endpoint: string,
  reason: string,
): Promise<void> {
  const { error } = await client
    .from('push_subscriptions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Could not deactivate dead web push subscription', {
      endpoint,
      reason,
      message: error.message,
    });
  }
}

async function getActiveNativeDeviceSessionIds(
  client: SupabaseClient,
  userSlug: string,
): Promise<number[]> {
  const { data, error } = await client
    .from('native_push_tokens')
    .select('device_session_id')
    .eq('user_slug', userSlug)
    .eq('platform', 'android')
    .eq('is_active', true);

  if (error) {
    console.error('Native push token lookup failed', {
      user_slug: userSlug,
      message: error.message,
    });
    return [];
  }

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => Number(row.device_session_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );
}

export async function sendNativePushToCounterpart(
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
      result: `native:${kind}:no-counterpart:${fromVisitor.user_slug}`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  const accessToken = await getFirebaseAccessToken();
  if (!accessToken) {
    return {
      success: false,
      result: `native:${kind}:no-provider`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  const config = getFirebaseConfig();
  if (!config) {
    return {
      success: false,
      result: `native:${kind}:no-provider`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  const { data: tokens, error } = await client
    .from('native_push_tokens')
    .select('id, token')
    .eq('user_slug', counterpartSlug)
    .eq('platform', 'android')
    .eq('is_active', true);

  if (error) {
    return {
      success: false,
      result: `native:${kind}:lookup-error:${error.message}`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  if (!tokens?.length) {
    return {
      success: false,
      result: `native:${kind}:no-tokens:${counterpartSlug}`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  let delivered = 0;
  let failed = 0;
  const channelId = options.androidChannelId || kind;
  const priority = kind === 'urgent' ? 'HIGH' : 'NORMAL';

  for (const row of tokens) {
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            data: stringifyFcmData({
              title,
              body,
              url,
              kind,
              from_user_slug: fromVisitor.user_slug,
              channel_id: channelId,
              ...(options.data || {}),
            }),
            android: {
              priority,
              ttl: kind === 'urgent' ? '7200s' : '86400s',
              collapse_key: kind === 'urgent' ? 'urgent-signal' : 'gentle-check-in',
            },
          },
        }),
      });
      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        failed += 1;
        console.error('Native push send failed', {
          token_id: row.id,
          message: responseBody?.error?.message || response.statusText,
        });

        if (isPermanentNativePushError(response.status, responseBody)) {
          await client
            .from('native_push_tokens')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', row.id);
        }

        continue;
      }

      delivered += 1;
      await client
        .from('native_push_tokens')
        .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', row.id);
    } catch (pushError) {
      failed += 1;
      console.error('Native push send failed', {
        token_id: row.id,
        message: pushError instanceof Error ? pushError.message : String(pushError),
      });
    }
  }

  return {
    success: delivered > 0,
    result: `native:${kind}:attempted=${tokens.length}:delivered=${delivered}:failed=${failed}`,
    delivered,
    failed,
    attempted: tokens.length,
  };
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
    .select('id, endpoint, subscription_json, device_session_id')
    .eq('user_slug', counterpartSlug)
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  const excludedSessionIds = new Set(
    (options.excludeDeviceSessionIds ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0),
  );
  const eligibleSubscriptions = (subscriptions ?? []).filter((subscription) => {
    const sessionId = Number(subscription.device_session_id);
    return !Number.isFinite(sessionId) || !excludedSessionIds.has(sessionId);
  });

  if (!eligibleSubscriptions.length) {
    return {
      success: false,
      result: subscriptions?.length
        ? `push:${kind}:no-web-subscriptions-after-native-dedupe:${counterpartSlug}`
        : `push:${kind}:no-subscriptions:${counterpartSlug}`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  ensureVapidConfigured();

  let delivered = 0;
  let failed = 0;

  for (const row of eligibleSubscriptions) {
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
      const status = getPushErrorStatus(pushError);
      console.error('Push send failed', {
        endpoint: row.endpoint,
        status,
        message: pushError instanceof Error ? pushError.message : String(pushError),
      });

      if (isPermanentWebPushError(pushError)) {
        await deactivateWebPushSubscription(
          client,
          row.id,
          row.endpoint,
          `web-push-${status}`,
        );
      }
    }
  }

  return {
    success: delivered > 0,
    result: `push:${kind}:attempted=${eligibleSubscriptions.length}:delivered=${delivered}:failed=${failed}`,
    delivered,
    failed,
    attempted: eligibleSubscriptions.length,
  };
}

export async function sendNotificationToCounterpart(
  client: SupabaseClient,
  fromVisitor: VisitorRow,
  kind: 'gentle' | 'urgent',
  title: string,
  body: string,
  url = getAppBaseUrl(),
  options: PushOptions = {},
): Promise<NotificationSendResult> {
  let native: PushSendResult;

  try {
    native = await sendNativePushToCounterpart(client, fromVisitor, kind, title, body, url, options);
  } catch (error) {
    native = {
      success: false,
      result: `native:${kind}:error:${error instanceof Error ? error.message : String(error)}`,
      delivered: 0,
      failed: 0,
      attempted: 0,
    };
  }

  const counterpartSlug = getCounterpartSlug(fromVisitor.user_slug);
  const nativeDeviceSessionIds = native.attempted > 0 && counterpartSlug
    ? await getActiveNativeDeviceSessionIds(client, counterpartSlug)
    : [];
  const web = await sendPushToCounterpart(client, fromVisitor, kind, title, body, options.webUrl || url, {
    ...options,
    excludeDeviceSessionIds: nativeDeviceSessionIds,
  });

  if (native.success && !web.success) {
    return {
      ...native,
      channel: 'native',
      result: `${native.result}; ${web.result}`,
    };
  }

  if (web.success) {
    return {
      success: true,
      channel: native.success ? 'native' : 'web',
      result: `${native.result}; ${web.result}`,
      delivered: native.delivered + web.delivered,
      failed: native.failed + web.failed,
      attempted: native.attempted + web.attempted,
    };
  }

  return {
    success: false,
    channel: 'none',
    result: `${native.result}; ${web.result}`,
    delivered: 0,
    failed: native.failed + web.failed,
    attempted: native.attempted + web.attempted,
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
