import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  sanitizeNoteContent,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
  content?: string;
};

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const visitor = await validateTileKey(client, body.tile_key ?? '');
    const content = sanitizeNoteContent(body.content ?? '');

    if (!content) {
      throw new Error('Note content is required.');
    }

    if (content.length > 300) {
      throw new Error('Keep notes at 300 characters or fewer.');
    }

    const { data: note, error } = await client
      .from('notes')
      .insert({
        from_user_slug: visitor.user_slug,
        content,
      })
      .select('id, from_user_slug, content, created_at')
      .single();

    if (error || !note) {
      throw new Error(error?.message || 'Could not save note.');
    }

    return json({
      note: {
        ...note,
        display_name: visitor.display_name,
        accent_color: visitor.accent_color,
        reactions: [],
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to add note.' }, 400);
  }
});
