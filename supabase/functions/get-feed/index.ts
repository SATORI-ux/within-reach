import {
  getAdminClient,
  getReactionsSummary,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
  withNoteReactions,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
};

type CheckInRow = {
  id: number;
  from_user_slug: string;
  display_name: string;
  accent_color: string | null;
  created_at: string;
};

type NoteRow = {
  id: number;
  from_user_slug: string;
  display_name: string;
  accent_color: string | null;
  content: string;
  created_at: string;
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

    const [{ data: checkIns, error: checkInError }, { data: notes, error: noteError }] = await Promise.all([
      client
        .from('check_in_feed')
        .select('id, from_user_slug, display_name, accent_color, created_at')
        .order('created_at', { ascending: false })
        .limit(40),
      client
        .from('notes_feed')
        .select('id, from_user_slug, display_name, accent_color, content, created_at')
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    if (checkInError) {
      throw new Error(checkInError.message);
    }

    if (noteError) {
      throw new Error(noteError.message);
    }

    const noteIds = (notes ?? []).map((note: NoteRow) => note.id);
    const reactionMap = await getReactionsSummary(client, noteIds, visitor.user_slug);

    return json({
      visitor: {
        user_slug: visitor.user_slug,
        display_name: visitor.display_name,
        accent_color: visitor.accent_color,
      },
      check_ins: (checkIns ?? []) as CheckInRow[],
      notes: withNoteReactions((notes ?? []) as NoteRow[], reactionMap),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to read feed.' }, 400);
  }
});
