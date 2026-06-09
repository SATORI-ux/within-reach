import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';
import {
  assertPrivatePagesEnabled,
  isValidSectionType,
  normalizeBody,
  normalizeBoolean,
  normalizeDate,
  normalizeEntryId,
  normalizeInteger,
  normalizeOptionalText,
  normalizeText,
  inferSecretEntrySubjectUserSlug,
  requireSecretEntryCreate,
  requireSecretEntryManage,
  withSignedSecretImage,
  type SecretEntryRow,
} from '../_shared/secret-page.ts';

type Payload = {
  tile_key?: string;
  entry?: {
    id?: string;
    section_type?: string;
    title?: string;
    subtitle?: string | null;
    body?: string;
    preview?: string | null;
    image_alt?: string | null;
    memory_date?: string | null;
    display_date?: string | null;
    display_order?: number;
    is_pinned?: boolean;
  };
};

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    assertPrivatePagesEnabled();

    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const visitor = await validateTileKey(client, body.tile_key ?? '');

    const entry = body.entry ?? {};
    const sectionType = normalizeText(entry.section_type, 80);
    const title = normalizeText(entry.title, 160);
    const now = new Date().toISOString();

    if (!isValidSectionType(sectionType)) {
      throw new Error('Choose a valid section.');
    }

    if (!title) {
      throw new Error('Entry title is required.');
    }

    const baseValues = {
      section_type: sectionType,
      title,
      subtitle: normalizeOptionalText(entry.subtitle, 220),
      body: normalizeBody(entry.body, sectionType),
      preview: normalizeOptionalText(entry.preview, 520),
      image_alt: normalizeOptionalText(entry.image_alt, 240),
      memory_date: normalizeDate(entry.memory_date),
      display_date: normalizeOptionalText(entry.display_date, 120),
      display_order: normalizeInteger(entry.display_order),
      is_pinned: normalizeBoolean(entry.is_pinned),
      updated_by: visitor.user_slug,
      updated_at: now,
    };
    const entryId = normalizeEntryId(entry.id);
    let existingEntry: SecretEntryRow | null = null;

    if (entryId) {
      const { data: existing, error: existingError } = await client
        .from('secret_entries')
        .select('*')
        .eq('id', entryId)
        .eq('is_archived', false)
        .single<SecretEntryRow>();

      if (existingError || !existing) {
        throw new Error(existingError?.message || 'Entry not found.');
      }

      await requireSecretEntryManage(client, visitor, existing);
      await requireSecretEntryCreate(client, visitor, sectionType);
      existingEntry = existing;
    } else {
      await requireSecretEntryCreate(client, visitor, sectionType);
    }

    const values = {
      ...baseValues,
      subject_user_slug: inferSecretEntrySubjectUserSlug(visitor, sectionType, existingEntry),
    };

    const query = entryId
      ? client
        .from('secret_entries')
        .update(values)
        .eq('id', entryId)
        .eq('is_archived', false)
        .select('*')
        .single()
      : client
        .from('secret_entries')
        .insert({
          ...values,
          created_by: visitor.user_slug,
        })
        .select('*')
        .single();

    const { data, error } = await query;

    if (error || !data) {
      throw new Error(error?.message || 'Could not save entry.');
    }

    return json({
      ok: true,
      entry: await withSignedSecretImage(client, data),
    }, 200, { req });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to save entry.',
    }, 400, { req });
  }
});
