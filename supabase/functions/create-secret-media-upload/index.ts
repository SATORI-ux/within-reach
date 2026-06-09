import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';
import {
  SECRET_PAGE_MEDIA_BUCKET,
  assertPrivatePagesEnabled,
  decodeBase64Image,
  getImageExtension,
  normalizeEntryId,
  normalizeOptionalText,
  requireSecretEntryManage,
  withSignedSecretImage,
  type SecretEntryRow,
} from '../_shared/secret-page.ts';

type Payload = {
  tile_key?: string;
  entry_id?: string;
  filename?: string;
  mime_type?: string;
  image_base64?: string;
  image_alt?: string | null;
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

    const entryId = normalizeEntryId(body.entry_id);
    if (!entryId) {
      throw new Error('Entry id is required.');
    }

    const mimeType = String(body.mime_type ?? '').trim().toLowerCase();
    const extension = getImageExtension(mimeType);
    const bytes = decodeBase64Image(body.image_base64, mimeType);

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

    const NO_IMAGE_SECTIONS = new Set(['thing_i_love', 'whisper']);
    if (NO_IMAGE_SECTIONS.has(existing.section_type)) {
      throw new Error('This section does not support image uploads.');
    }

    const objectPath = `${entryId}/${crypto.randomUUID()}.${extension}`;
    const upload = await client.storage
      .from(SECRET_PAGE_MEDIA_BUCKET)
      .upload(objectPath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    if (existing.image_path) {
      await client.storage.from(SECRET_PAGE_MEDIA_BUCKET).remove([existing.image_path]);
    }

    const { data: updated, error: updateError } = await client
      .from('secret_entries')
      .update({
        image_path: objectPath,
        image_alt: normalizeOptionalText(body.image_alt, 240),
        updated_by: visitor.user_slug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select('*')
      .single<SecretEntryRow>();

    if (updateError || !updated) {
      await client.storage.from(SECRET_PAGE_MEDIA_BUCKET).remove([objectPath]);
      throw new Error(updateError?.message || 'Could not attach image.');
    }

    return json({
      ok: true,
      image_path: objectPath,
      entry: await withSignedSecretImage(client, updated),
    }, 200, { req });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to upload image.',
    }, 400, { req });
  }
});
