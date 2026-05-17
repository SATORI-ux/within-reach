import {
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
  note_ids?: number[];
};

type DrawingRow = {
  note_id: number;
  storage_path: string;
  mime_type: string;
  width: number;
  height: number;
  size_bytes: number | null;
  ink_color: string | null;
};

const BUCKET_NAME = 'note-drawings';
const MAX_NOTE_IDS = 20;

function normalizeNoteIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
        .map((item) => Math.floor(item)),
    ),
  ).slice(0, MAX_NOTE_IDS);
}

Deno.serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) return optionsResponse;

  const methodResponse = requirePost(req);
  if (methodResponse) return methodResponse;

  try {
    const client = getAdminClient();
    const body = await readJson<Payload>(req);
    await validateTileKey(client, body.tile_key ?? '');

    const noteIds = normalizeNoteIds(body.note_ids);
    if (!noteIds.length) {
      return json({ drawings: [] }, 200, { req });
    }

    const { data, error } = await client
      .from('note_drawings')
      .select('note_id, storage_path, mime_type, width, height, size_bytes, ink_color')
      .in('note_id', noteIds);

    if (error) {
      throw new Error(error.message);
    }

    const drawings = await Promise.all(
      ((data ?? []) as DrawingRow[]).map(async (drawing) => {
        const signed = await client.storage
          .from(BUCKET_NAME)
          .createSignedUrl(drawing.storage_path, 60 * 60);

        return {
          note_id: drawing.note_id,
          url: signed.data?.signedUrl ?? null,
          mime_type: drawing.mime_type,
          width: drawing.width,
          height: drawing.height,
          size_bytes: drawing.size_bytes,
          ink_color: drawing.ink_color,
        };
      }),
    );

    return json({ drawings }, 200, { req });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Unable to read drawing notes.',
    }, 400, { req });
  }
});
