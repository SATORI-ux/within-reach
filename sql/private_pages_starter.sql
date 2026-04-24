-- Private build starter for the protected kept page.
--
-- Apply this after sql/schema.sql and sql/seed.sql, and only to the private
-- build database. It gives public.private_pages a complete payload shape that
-- kept.html can render without guessing field names.

begin;

insert into public.private_pages (user_slug, content)
values (
  'jeszi',
  jsonb_build_object(
    'hero', jsonb_build_object(
      'eyebrow', 'Quietly kept',
      'title', 'A page kept for you.',
      'opening', 'This is the first held shape for the private page. Replace it with the note, memory, or promise this page is meant to keep.'
    ),
    'letter', jsonb_build_object(
      'label', 'For you',
      'title', 'A note that stayed.',
      'paragraphs', jsonb_build_array(
        'Start here with the words that should be found after the hidden door opens.',
        'Keep the page spare. A few true lines will carry more than a full archive.'
      )
    ),
    'meaning', jsonb_build_object(
      'label', 'What this holds',
      'title', 'Two small anchors.',
      'cards', jsonb_build_array(
        jsonb_build_object(
          'title', 'First thread',
          'body', 'Use this for one short meaning, name, place, date, or private shorthand.'
        ),
        jsonb_build_object(
          'title', 'Second thread',
          'body', 'Use this for the companion piece, or remove this card if the page wants less.'
        )
      ),
      'paragraphs', jsonb_build_array(
        'This section can hold the quiet explanation beneath the note. It can also be removed entirely.'
      )
    ),
    'video', jsonb_build_object(
      'label', 'A moving piece',
      'title', 'A small video can live here.',
      'placeholder', 'Add a private video source later, or remove the video block.'
    ),
    'images', jsonb_build_object(
      'label', 'Kept images',
      'title', 'A few still things.',
      'items', jsonb_build_array(
        jsonb_build_object(
          'placeholder', 'Image one can wait here.'
        ),
        jsonb_build_object(
          'placeholder', 'Image two can wait here.'
        )
      )
    ),
    'closing_line', 'Still here.'
  )
)
on conflict (user_slug) do update
set
  content = excluded.content,
  updated_at = now();

commit;
