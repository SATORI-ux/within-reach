import {
  assertWriteCooldown,
  getAdminClient,
  handleOptions,
  json,
  readJson,
  requirePost,
  sendNoteNotificationToCounterpart,
  validateTileKey,
} from '../_shared/utils.ts';

type Payload = {
  tile_key?: string;
  image_base64?: string;
  ink_color?: string;
  width?: number;
  height?: number;
};

const BUCKET_NAME = 'note-drawings';
const MAX_IMAGE_BYTES = 450_000;
const DEFAULT_WIDTH = 768;
const DEFAULT_HEIGHT = 576;
const DRAWING_NOTE_LINES = [
  'from my fingertip to yours',
  'a captured daydream',
  'a small trace, left by hand',
  'a thought that needed a shape',
  'something wordless, left softly',
  'a soft mark across the distance',
  'drawn while thinking of you',
  'digital snugz',
  'held here in ink',
];

function pickDrawingNoteLine(): string {
  return DRAWING_NOTE_LINES[Math.floor(Math.random() * DRAWING_NOTE_LINES.length)];
}

function normalizeHexColor(value: string | undefined): string | null {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}

function decodeBase64Png(base64: string | undefined): Uint8Array {
  const normalized = String(base64 || '').replace(/^data:image\/png;base64,/, '').trim();

  if (!normalized) {
    throw new Error('Drawing image is required.');
  }

  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('Keep the drawing small before sending.');
  }

  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  const isPng = pngSignature.every((byte, index) => bytes[index] === byte);
  if (!isPng) {
    throw new Error('Drawing must be a PNG image.');
  }

  return bytes;
}

function normalizeDimension(value: number | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), 1600);
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
    const bytes = decodeBase64Png(body.image_base64);
    const width = normalizeDimension(body.width, DEFAULT_WIDTH);
    const height = normalizeDimension(body.height, DEFAULT_HEIGHT);
    const inkColor = normalizeHexColor(body.ink_color);

    await assertWriteCooldown(client, 'notes', visitor.user_slug, 10, 'note');

    const { data: note, error: noteError } = await client
      .from('notes')
      .insert({
        from_user_slug: visitor.user_slug,
        content: pickDrawingNoteLine(),
        note_type: 'drawing',
      })
      .select('id, from_user_slug, content, note_type, created_at')
      .single();

    if (noteError || !note) {
      throw new Error(noteError?.message || 'Could not save drawing note.');
    }

    const storagePath = `${visitor.user_slug}/${note.id}-${crypto.randomUUID()}.png`;
    const upload = await client.storage
      .from(BUCKET_NAME)
      .upload(storagePath, bytes, {
        contentType: 'image/png',
        upsert: false,
      });

    if (upload.error) {
      await client.from('notes').delete().eq('id', note.id);
      throw new Error(upload.error.message);
    }

    const { error: drawingError } = await client
      .from('note_drawings')
      .insert({
        note_id: note.id,
        storage_path: storagePath,
        mime_type: 'image/png',
        width,
        height,
        size_bytes: bytes.length,
        ink_color: inkColor,
      });

    if (drawingError) {
      await client.storage.from(BUCKET_NAME).remove([storagePath]);
      await client.from('notes').delete().eq('id', note.id);
      throw new Error(drawingError.message);
    }

    const signed = await client.storage.from(BUCKET_NAME).createSignedUrl(storagePath, 60 * 60);
    const notification = await sendNoteNotificationToCounterpart(client, visitor, Number(note.id), 'drawing');

    return json({
      note: {
        ...note,
        display_name: visitor.display_name,
        accent_color: visitor.accent_color,
        reactions: [],
        drawing: {
          storage_path: storagePath,
          url: signed.data?.signedUrl ?? null,
          width,
          height,
          ink_color: inkColor,
        },
      },
      notification: {
        success: notification.success,
        result: notification.result,
        delivered: notification.delivered,
        failed: notification.failed,
        attempted: notification.attempted,
      },
    }, 200, { req });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Unable to add drawing note.',
    }, 400, { req });
  }
});
