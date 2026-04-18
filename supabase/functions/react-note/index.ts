import {
  ALLOWED_REACTIONS,
  getAdminClient,
  getReactionsSummary,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
  note_id?: number;
  reaction?: string;
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
    const noteId = Number(body.note_id);
    const reaction = (body.reaction ?? '').trim();

    if (!Number.isInteger(noteId) || noteId <= 0) {
      throw new Error('A valid note id is required.');
    }

    if (!ALLOWED_REACTIONS.includes(reaction)) {
      throw new Error('That reaction is not allowed.');
    }

    const { data: note, error: noteError } = await client
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .maybeSingle();

    if (noteError) {
      throw new Error(noteError.message);
    }

    if (!note) {
      throw new Error('That note does not exist.');
    }

    const { data: existingReaction, error: existingReactionError } = await client
      .from('note_reactions')
      .select('id')
      .eq('note_id', noteId)
      .eq('from_user_slug', visitor.user_slug)
      .eq('reaction', reaction)
      .maybeSingle();

    if (existingReactionError) {
      throw new Error(existingReactionError.message);
    }

    let action: 'added' | 'removed' = 'added';

    if (existingReaction) {
      const { error: deleteError } = await client
        .from('note_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      action = 'removed';
    } else {
      const { error: insertError } = await client
        .from('note_reactions')
        .insert({
          note_id: noteId,
          from_user_slug: visitor.user_slug,
          reaction,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    const reactionMap = await getReactionsSummary(client, [noteId], visitor.user_slug);

    return json({
      note_id: noteId,
      action,
      reactions: reactionMap.get(noteId) ?? [],
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to react to note.' }, 400);
  }
});
