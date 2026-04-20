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
import { getSecretState } from '../_shared/secret.ts';

type Payload = {
  tile_key?: string;
  check_ins_limit?: number;
  check_ins_before_id?: number;
  notes_limit?: number;
  notes_before_id?: number;
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

type PageInfo = {
  has_more: boolean;
  next_before_id: number | null;
};

const DEFAULT_CHECK_INS_LIMIT = 8;
const DEFAULT_NOTES_LIMIT = 5;
const MAX_CHECK_INS_LIMIT = 20;
const MAX_NOTES_LIMIT = 20;

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function normalizeBeforeId(value: number | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function buildPageInfo<T extends { id: number }>(rows: T[], limit: number): { items: T[]; page: PageInfo } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextBeforeId = hasMore && items.length ? items[items.length - 1].id : null;

  return {
    items,
    page: {
      has_more: hasMore,
      next_before_id: nextBeforeId,
    },
  };
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    const visitor = await validateTileKey(client, body.tile_key ?? '');

    const checkInsLimit = normalizeLimit(body.check_ins_limit, DEFAULT_CHECK_INS_LIMIT, MAX_CHECK_INS_LIMIT);
    const notesLimit = normalizeLimit(body.notes_limit, DEFAULT_NOTES_LIMIT, MAX_NOTES_LIMIT);

    const checkInsBeforeId = normalizeBeforeId(body.check_ins_before_id);
    const notesBeforeId = normalizeBeforeId(body.notes_before_id);

    let checkInsQuery = client
      .from('check_in_feed')
      .select('id, from_user_slug, display_name, accent_color, created_at')
      .order('id', { ascending: false })
      .limit(checkInsLimit + 1);

    if (checkInsBeforeId !== null) {
      checkInsQuery = checkInsQuery.lt('id', checkInsBeforeId);
    }

    let notesQuery = client
      .from('notes_feed')
      .select('id, from_user_slug, display_name, accent_color, content, created_at')
      .order('id', { ascending: false })
      .limit(notesLimit + 1);

    if (notesBeforeId !== null) {
      notesQuery = notesQuery.lt('id', notesBeforeId);
    }

    const [
      { data: rawCheckIns, error: checkInError },
      { data: rawNotes, error: noteError },
    ] = await Promise.all([checkInsQuery, notesQuery]);

    if (checkInError) {
      throw new Error(checkInError.message);
    }

    if (noteError) {
      throw new Error(noteError.message);
    }

    const {
      items: checkIns,
      page: checkInsPage,
    } = buildPageInfo((rawCheckIns ?? []) as CheckInRow[], checkInsLimit);

    const {
      items: notes,
      page: notesPage,
    } = buildPageInfo((rawNotes ?? []) as NoteRow[], notesLimit);

    const noteIds = notes.map((note) => note.id);
    const reactionMap = await getReactionsSummary(client, noteIds, visitor.user_slug);

    return json({
      visitor: {
        user_slug: visitor.user_slug,
        display_name: visitor.display_name,
        accent_color: visitor.accent_color,
      },
      secret_state: await getSecretState(client, visitor.user_slug),
      check_ins: checkIns,
      check_ins_page: checkInsPage,
      notes: withNoteReactions(notes, reactionMap),
      notes_page: notesPage,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to read feed.' }, 400);
  }
});
