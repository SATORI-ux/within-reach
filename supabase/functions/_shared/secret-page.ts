import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { VisitorRow } from './utils.ts';
import { getSecretAlwaysUnlockUserSlug, getSecretPageAccess, getSecretTargetUserSlug } from './secret.ts';

export const SECRET_PAGE_SLUG = 'quietly-kept';
export const SECRET_PAGE_MEDIA_BUCKET = 'secret-page-media';
export const SECRET_ENTRY_BODY_MAX_LENGTH = 20000;
export const SECRET_WHISPER_BODY_MAX_LENGTH = 15000;
export const SECRET_POEM_BODY_MAX_LENGTH = 10000;

const SECTION_TYPES = new Set([
  'little_proof',
  'thing_i_love',
  'still_being_written',
  'whisper',
  'poem',
]);

const SECTION_BODY_MAX_LENGTHS: Record<string, number> = {
  little_proof: SECRET_ENTRY_BODY_MAX_LENGTH,
  thing_i_love: SECRET_ENTRY_BODY_MAX_LENGTH,
  still_being_written: SECRET_ENTRY_BODY_MAX_LENGTH,
  whisper: SECRET_WHISPER_BODY_MAX_LENGTH,
  poem: SECRET_POEM_BODY_MAX_LENGTH,
};

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type SecretEntryRow = {
  id: string;
  section_type: string;
  title: string;
  subtitle: string | null;
  body: string;
  preview: string | null;
  image_path: string | null;
  image_alt: string | null;
  memory_date: string | null;
  display_date: string | null;
  display_order: number;
  is_pinned: boolean;
  is_archived: boolean;
  created_by: string | null;
  subject_user_slug: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SecretEntryWithPermissions = SecretEntryRow & {
  image_url: string | null;
  can_edit: boolean;
};

export type SecretPageContentRow = {
  page_slug: string;
  content: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type SecretFinalAskResponse = 'yes' | 'talk_first';

export type SecretFinalAskRow = {
  id: string;
  status: 'hidden' | 'revealed' | 'answered';
  response: SecretFinalAskResponse | null;
  revealed_at: string | null;
  revealed_by: string | null;
  responded_at: string | null;
  responded_by: string | null;
  accepted_at: string | null;
  reset_at: string | null;
  reset_by: string | null;
  joey_celebration_seen_at: string | null;
  jeszi_celebration_seen_at: string | null;
  yes_notification_sent_at: string | null;
  talk_first_notification_sent_at: string | null;
  anniversary_enabled: boolean;
  anniversary_timezone: string | null;
  last_anniversary_sent_for_year: number | null;
  created_at: string;
  updated_at: string;
};

export type SecretFinalAskForViewer = Omit<SecretFinalAskRow, 'id'> & {
  visible: boolean;
  can_reveal: boolean;
  can_respond: boolean;
  can_reset: boolean;
};

type SecretFinalAskCelebrationField = 'joey_celebration_seen_at' | 'jeszi_celebration_seen_at';

type TallyCounts = {
  user_slug: string;
  display_name: string;
  thoughts_count: number;
  notes_count: number;
};

export const EMPTY_SECRET_PAGE_CONTENT = {
  hero: {
    eyebrow: 'Private page',
    title: 'Protected content waits here.',
    opening: 'Add the protected page content from the editor.',
  },
  opening_note: {
    title: '',
    preview: '',
    body: '',
  },
  section_visibility: {
    little_proof: true,
  },
  poem: {
    title: 'Untitled',
    body: '',
  },
  two_names: {
    title: 'Names',
    cards: [],
    closing: '',
  },
  section_intros: {
    little_proof: '',
    thing_i_love: '',
    still_being_written: '',
    whisper: '',
    poem: '',
  },
  tally: {
    title: 'Private tally',
    intro: '',
    thoughts_label: 'check-ins',
    notes_label: 'notes',
  },
  ask: {
    title: 'Protected note',
    body: '',
    question: '',
    button: '',
    footnote: '',
  },
  final_ask: {
    hidden_title: '',
    revealed_title: '',
    intro: '',
    body: '',
    question: '',
    yes_label: '',
    talk_first_label: '',
    yes_screen_copy: '',
    talk_first_screen_copy: '',
    accepted_memory_copy: '',
  },
};

export function assertPrivatePagesEnabled() {
  if (Deno.env.get('WITHIN_REACH_PRIVATE_PAGES_ENABLED') !== 'true') {
    throw new Error('Private pages are not enabled for this deployment.');
  }
}

export async function requireSecretPageView(
  client: SupabaseClient,
  visitor: VisitorRow,
) {
  const access = await getSecretPageAccess(client, visitor.user_slug);
  if (!access.can_view_secret_page) {
    throw new Error('This page is not available yet.');
  }

  return access;
}

export async function requireSecretFixedContentEdit(
  client: SupabaseClient,
  visitor: VisitorRow,
) {
  const access = await requireSecretPageView(client, visitor);
  if (!access.can_edit_fixed_content) {
    throw new Error('Fixed page content can only be edited by its owner.');
  }

  return access;
}

export function canCreateSecretEntry(
  allowedEntrySections: string[],
  sectionType: string,
): boolean {
  return allowedEntrySections.includes(sectionType);
}

export function canManageSecretEntry(
  visitor: VisitorRow,
  entry: Pick<SecretEntryRow, 'created_by'>,
): boolean {
  return Boolean(entry.created_by && entry.created_by === visitor.user_slug);
}

export function getSecretCounterpartUserSlug(userSlug: string): string | null {
  const ownerSlug = getSecretAlwaysUnlockUserSlug();
  const targetSlug = getSecretTargetUserSlug();

  if (userSlug === ownerSlug) return targetSlug;
  if (userSlug === targetSlug) return ownerSlug;
  return null;
}

export function isSecretOwnerUser(userSlug: string): boolean {
  return userSlug === getSecretAlwaysUnlockUserSlug();
}

export function isSecretTargetUser(userSlug: string): boolean {
  return userSlug === getSecretTargetUserSlug();
}

export function inferSecretEntrySubjectUserSlug(
  visitor: VisitorRow,
  sectionType: string,
  existing?: Pick<SecretEntryRow, 'subject_user_slug'> | null,
): string | null {
  if (sectionType !== 'thing_i_love') return null;

  const counterpartSlug = getSecretCounterpartUserSlug(visitor.user_slug);
  if (counterpartSlug) return counterpartSlug;

  return existing?.subject_user_slug ?? null;
}

export async function requireSecretEntryCreate(
  client: SupabaseClient,
  visitor: VisitorRow,
  sectionType: string,
) {
  const access = await requireSecretPageView(client, visitor);
  if (!canCreateSecretEntry(access.allowed_entry_sections, sectionType)) {
    throw new Error('This session cannot add entries to that section.');
  }

  return access;
}

export async function requireSecretEntryManage(
  client: SupabaseClient,
  visitor: VisitorRow,
  entry: SecretEntryRow,
) {
  const access = await requireSecretPageView(client, visitor);
  if (!canCreateSecretEntry(access.allowed_entry_sections, entry.section_type) || !canManageSecretEntry(visitor, entry)) {
    throw new Error('This session cannot edit that entry.');
  }

  return access;
}

export function normalizeSecretPageContent(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return EMPTY_SECRET_PAGE_CONTENT;
  }

  return {
    ...EMPTY_SECRET_PAGE_CONTENT,
    ...(value as Record<string, unknown>),
  };
}

export function isValidSectionType(value: string): boolean {
  return SECTION_TYPES.has(value);
}

export function normalizeText(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

export function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  const text = normalizeText(value, maxLength);
  return text || null;
}

export function getSecretEntryBodyMaxLength(sectionType: string): number {
  return SECTION_BODY_MAX_LENGTHS[sectionType] ?? SECRET_ENTRY_BODY_MAX_LENGTH;
}

export function normalizeBody(value: unknown, sectionType: string): string {
  const body = String(value ?? '').trim();
  const maxLength = getSecretEntryBodyMaxLength(sectionType);

  if (!body) {
    throw new Error('Entry body is required.');
  }

  if (body.length > maxLength) {
    throw new Error(`Keep entry body at ${maxLength} characters or fewer.`);
  }

  return body;
}

export function normalizeEntryId(value: unknown): string | null {
  const id = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

export function normalizeDate(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function normalizeInteger(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(-100000, Math.min(100000, Math.floor(parsed)));
}

export function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

export async function getSecretPageContent(
  client: SupabaseClient,
): Promise<{ content: Record<string, unknown>; updated_at: string | null }> {
  const { data, error } = await client
    .from('secret_page_content')
    .select('page_slug, content, created_at, updated_at')
    .eq('page_slug', SECRET_PAGE_SLUG)
    .maybeSingle<SecretPageContentRow>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    content: normalizeSecretPageContent(data?.content),
    updated_at: data?.updated_at ?? null,
  };
}

function getEmptySecretFinalAskRow(): SecretFinalAskRow {
  const now = new Date(0).toISOString();
  return {
    id: '',
    status: 'hidden',
    response: null,
    revealed_at: null,
    revealed_by: null,
    responded_at: null,
    responded_by: null,
    accepted_at: null,
    reset_at: null,
    reset_by: null,
    joey_celebration_seen_at: null,
    jeszi_celebration_seen_at: null,
    yes_notification_sent_at: null,
    talk_first_notification_sent_at: null,
    anniversary_enabled: false,
    anniversary_timezone: null,
    last_anniversary_sent_for_year: null,
    created_at: now,
    updated_at: now,
  };
}

export function normalizeFinalAskResponse(value: unknown): SecretFinalAskResponse {
  if (value === 'yes' || value === 'talk_first') return value;
  throw new Error('Choose a valid Final Ask response.');
}

export async function getSecretFinalAskState(client: SupabaseClient): Promise<SecretFinalAskRow> {
  const { data, error } = await client
    .from('secret_final_ask')
    .select([
      'id',
      'status',
      'response',
      'revealed_at',
      'revealed_by',
      'responded_at',
      'responded_by',
      'accepted_at',
      'reset_at',
      'reset_by',
      'joey_celebration_seen_at',
      'jeszi_celebration_seen_at',
      'yes_notification_sent_at',
      'talk_first_notification_sent_at',
      'anniversary_enabled',
      'anniversary_timezone',
      'last_anniversary_sent_for_year',
      'created_at',
      'updated_at',
    ].join(', '))
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<SecretFinalAskRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? getEmptySecretFinalAskRow();
}

export function getSecretFinalAskForViewer(
  row: SecretFinalAskRow,
  visitor: VisitorRow,
): SecretFinalAskForViewer {
  const isOwner = isSecretOwnerUser(visitor.user_slug);
  const isTarget = isSecretTargetUser(visitor.user_slug);
  const visible = row.status !== 'hidden' || isOwner;

  return {
    status: row.status,
    response: row.response,
    revealed_at: row.revealed_at,
    revealed_by: row.revealed_by,
    responded_at: row.responded_at,
    responded_by: row.responded_by,
    accepted_at: row.accepted_at,
    reset_at: row.reset_at,
    reset_by: row.reset_by,
    joey_celebration_seen_at: row.joey_celebration_seen_at,
    jeszi_celebration_seen_at: row.jeszi_celebration_seen_at,
    yes_notification_sent_at: row.yes_notification_sent_at,
    talk_first_notification_sent_at: row.talk_first_notification_sent_at,
    anniversary_enabled: row.anniversary_enabled,
    anniversary_timezone: row.anniversary_timezone,
    last_anniversary_sent_for_year: row.last_anniversary_sent_for_year,
    created_at: row.created_at,
    updated_at: row.updated_at,
    visible,
    can_reveal: isOwner && row.status === 'hidden',
    can_respond: isTarget && row.status === 'revealed',
    can_reset: isOwner,
  };
}

async function ensureSecretFinalAskRow(client: SupabaseClient): Promise<SecretFinalAskRow> {
  const existing = await getSecretFinalAskState(client);
  if (existing.id) return existing;

  const { data, error } = await client
    .from('secret_final_ask')
    .insert({})
    .select('*')
    .single<SecretFinalAskRow>();

  if (error || !data) {
    throw new Error(error?.message || 'Could not create Final Ask state.');
  }

  return data;
}

export async function revealSecretFinalAsk(
  client: SupabaseClient,
  visitor: VisitorRow,
): Promise<SecretFinalAskRow> {
  await requireSecretFixedContentEdit(client, visitor);
  const state = await ensureSecretFinalAskRow(client);

  if (state.status !== 'hidden') {
    throw new Error('The Final Ask is already active.');
  }

  const now = new Date().toISOString();
  const { data, error } = await client
    .from('secret_final_ask')
    .update({
      status: 'revealed',
      response: null,
      revealed_at: now,
      revealed_by: visitor.user_slug,
      responded_at: null,
      responded_by: null,
      accepted_at: null,
      updated_at: now,
    })
    .eq('id', state.id)
    .eq('status', 'hidden')
    .select('*')
    .single<SecretFinalAskRow>();

  if (error || !data) {
    throw new Error(error?.message || 'Could not reveal the Final Ask.');
  }

  return data;
}

export async function respondSecretFinalAsk(
  client: SupabaseClient,
  visitor: VisitorRow,
  response: SecretFinalAskResponse,
): Promise<SecretFinalAskRow> {
  await requireSecretPageView(client, visitor);

  if (!isSecretTargetUser(visitor.user_slug)) {
    throw new Error('Only the intended recipient can answer the Final Ask.');
  }

  const state = await getSecretFinalAskState(client);
  if (!state.id || state.status !== 'revealed') {
    throw new Error('The Final Ask is not open for a response.');
  }

  const now = new Date().toISOString();
  const { data, error } = await client
    .from('secret_final_ask')
    .update({
      status: 'answered',
      response,
      responded_at: now,
      responded_by: visitor.user_slug,
      accepted_at: response === 'yes' ? now : null,
      updated_at: now,
    })
    .eq('id', state.id)
    .eq('status', 'revealed')
    .select('*')
    .single<SecretFinalAskRow>();

  if (error || !data) {
    throw new Error(error?.message || 'Could not save the Final Ask response.');
  }

  return data;
}

export async function resetSecretFinalAsk(
  client: SupabaseClient,
  visitor: VisitorRow,
): Promise<SecretFinalAskRow> {
  await requireSecretFixedContentEdit(client, visitor);
  const state = await ensureSecretFinalAskRow(client);
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('secret_final_ask')
    .update({
      status: 'hidden',
      response: null,
      revealed_at: null,
      revealed_by: null,
      responded_at: null,
      responded_by: null,
      accepted_at: null,
      joey_celebration_seen_at: null,
      jeszi_celebration_seen_at: null,
      reset_at: now,
      reset_by: visitor.user_slug,
      updated_at: now,
    })
    .eq('id', state.id)
    .select('*')
    .single<SecretFinalAskRow>();

  if (error || !data) {
    throw new Error(error?.message || 'Could not reset the Final Ask.');
  }

  return data;
}

export async function markSecretFinalAskCelebrationSeen(
  client: SupabaseClient,
  visitor: VisitorRow,
): Promise<SecretFinalAskRow> {
  await requireSecretPageView(client, visitor);

  const state = await getSecretFinalAskState(client);
  if (!state.id || state.status !== 'answered' || state.response !== 'yes') {
    throw new Error('There is no accepted Final Ask celebration to mark.');
  }

  let field: SecretFinalAskCelebrationField | null = null;
  if (isSecretOwnerUser(visitor.user_slug)) {
    field = 'joey_celebration_seen_at';
  } else if (isSecretTargetUser(visitor.user_slug)) {
    field = 'jeszi_celebration_seen_at';
  }

  if (!field) {
    throw new Error('This session cannot mark the Final Ask celebration.');
  }

  if (state[field]) return state;

  const now = new Date().toISOString();
  const { data, error } = await client
    .from('secret_final_ask')
    .update({
      [field]: now,
      updated_at: now,
    })
    .eq('id', state.id)
    .eq('status', 'answered')
    .eq('response', 'yes')
    .select('*')
    .single<SecretFinalAskRow>();

  if (error || !data) {
    throw new Error(error?.message || 'Could not mark the Final Ask celebration seen.');
  }

  return data;
}

export async function getSecretTallyCounts(client: SupabaseClient): Promise<TallyCounts[]> {
  const { data: visitors, error: visitorError } = await client
    .from('tile_keys')
    .select('user_slug, display_name')
    .eq('is_active', true)
    .order('display_name', { ascending: true });

  if (visitorError) {
    throw new Error(visitorError.message);
  }

  return await Promise.all(
    (visitors ?? []).map(async (visitor) => {
      const [{ count: thoughtsCount, error: thoughtsError }, { count: notesCount, error: notesError }] =
        await Promise.all([
          client
            .from('check_ins')
            .select('*', { count: 'exact', head: true })
            .eq('from_user_slug', visitor.user_slug),
          client
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('from_user_slug', visitor.user_slug),
        ]);

      if (thoughtsError) {
        throw new Error(thoughtsError.message);
      }

      if (notesError) {
        throw new Error(notesError.message);
      }

      return {
        user_slug: visitor.user_slug,
        display_name: visitor.display_name,
        thoughts_count: thoughtsCount ?? 0,
        notes_count: notesCount ?? 0,
      };
    }),
  );
}

export async function withSignedSecretImage(
  client: SupabaseClient,
  entry: SecretEntryRow,
): Promise<SecretEntryRow & { image_url: string | null }> {
  let image_url: string | null = null;

  if (entry.image_path) {
    const signed = await client.storage
      .from(SECRET_PAGE_MEDIA_BUCKET)
      .createSignedUrl(entry.image_path, 60 * 60);

    image_url = signed.data?.signedUrl ?? null;
  }

  return {
    ...entry,
    image_url,
  };
}

export async function getSecretEntries(client: SupabaseClient) {
  const { data, error } = await client
    .from('secret_entries')
    .select([
      'id',
      'section_type',
      'title',
      'subtitle',
      'body',
      'preview',
      'image_path',
      'image_alt',
      'memory_date',
      'display_date',
      'display_order',
      'is_pinned',
      'is_archived',
      'created_by',
      'subject_user_slug',
      'updated_by',
      'created_at',
      'updated_at',
    ].join(', '))
    .eq('is_archived', false)
    .order('is_pinned', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as SecretEntryRow[];
  const entries = await Promise.all(
    rows.map((entry) => withSignedSecretImage(client, entry)),
  );

  const byOriginalPostingOrder = (left: SecretEntryRow, right: SecretEntryRow) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();

    if (leftTime !== rightTime) return leftTime - rightTime;
    return left.id.localeCompare(right.id);
  };

  return {
    little_proof: entries.filter((entry) => entry.section_type === 'little_proof'),
    thing_i_love: entries.filter((entry) => entry.section_type === 'thing_i_love'),
    still_being_written: entries.filter((entry) => entry.section_type === 'still_being_written'),
    whisper: entries
      .filter((entry) => entry.section_type === 'whisper')
      .sort(byOriginalPostingOrder),
    poem: entries
      .filter((entry) => entry.section_type === 'poem')
      .sort(byOriginalPostingOrder),
  };
}

export async function getSecretEntriesForViewer(
  client: SupabaseClient,
  visitor: VisitorRow,
): Promise<{
  little_proof: SecretEntryWithPermissions[];
  thing_i_love: SecretEntryWithPermissions[];
  still_being_written: SecretEntryWithPermissions[];
  whisper: SecretEntryWithPermissions[];
  poem: SecretEntryWithPermissions[];
}> {
  const access = await requireSecretPageView(client, visitor);
  const groups = await getSecretEntries(client);
  const markPermissions = (entries: Array<SecretEntryRow & { image_url: string | null }>) =>
    entries.map((entry) => ({
      ...entry,
      can_edit: canCreateSecretEntry(access.allowed_entry_sections, entry.section_type) &&
        canManageSecretEntry(visitor, entry),
    }));

  return {
    little_proof: markPermissions(groups.little_proof),
    thing_i_love: markPermissions(groups.thing_i_love),
    still_being_written: markPermissions(groups.still_being_written),
    whisper: markPermissions(groups.whisper),
    poem: markPermissions(groups.poem),
  };
}

export function getImageExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  const extension = ALLOWED_IMAGE_TYPES[normalized];
  if (!extension) {
    throw new Error('Use a jpg, png, or webp image.');
  }

  return extension;
}

export function decodeBase64Image(value: unknown, expectedMimeType: string): Uint8Array {
  const raw = String(value ?? '').trim();
  if (!raw) {
    throw new Error('Image file is required.');
  }

  const dataUrlMatch = raw.match(/^data:([^;]+);base64,(.+)$/);
  const encoded = dataUrlMatch ? dataUrlMatch[2] : raw;
  const dataUrlMimeType = dataUrlMatch ? dataUrlMatch[1].toLowerCase() : '';
  const mimeType = expectedMimeType.toLowerCase();

  if (dataUrlMimeType && dataUrlMimeType !== mimeType) {
    throw new Error('Image type does not match the selected file.');
  }

  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  if (bytes.length > 10 * 1024 * 1024) {
    throw new Error('Keep images at 10 MB or smaller.');
  }

  return bytes;
}
