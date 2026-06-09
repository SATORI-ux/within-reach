import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { VisitorRow } from './utils.ts';
import { getSecretAlwaysUnlockUserSlug, getSecretPageAccess } from './secret.ts';

export const SECRET_PAGE_SLUG = 'quietly-kept';
export const SECRET_PAGE_MEDIA_BUCKET = 'secret-page-media';
export const SECRET_ENTRY_BODY_MAX_LENGTH = 20000;

const SECTION_TYPES = new Set([
  'little_proof',
  'thing_i_love',
  'still_being_written',
]);

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
  opening_note: '',
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
  if (visitor.user_slug === getSecretAlwaysUnlockUserSlug()) return true;
  return Boolean(entry.created_by && entry.created_by === visitor.user_slug);
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

export function normalizeBody(value: unknown): string {
  const body = String(value ?? '').trim();

  if (!body) {
    throw new Error('Entry body is required.');
  }

  if (body.length > SECRET_ENTRY_BODY_MAX_LENGTH) {
    throw new Error(`Keep entry body at ${SECRET_ENTRY_BODY_MAX_LENGTH} characters or fewer.`);
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
      'updated_by',
      'created_at',
      'updated_at',
    ].join(', '))
    .eq('is_archived', false)
    .order('is_pinned', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as SecretEntryRow[];
  const entries = await Promise.all(
    rows.map((entry) => withSignedSecretImage(client, entry)),
  );

  return {
    little_proof: entries.filter((entry) => entry.section_type === 'little_proof'),
    thing_i_love: entries.filter((entry) => entry.section_type === 'thing_i_love'),
    still_being_written: entries.filter((entry) => entry.section_type === 'still_being_written'),
  };
}

export async function getSecretEntriesForViewer(
  client: SupabaseClient,
  visitor: VisitorRow,
): Promise<{
  little_proof: SecretEntryWithPermissions[];
  thing_i_love: SecretEntryWithPermissions[];
  still_being_written: SecretEntryWithPermissions[];
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
