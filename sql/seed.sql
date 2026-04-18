insert into public.tile_keys (tile_key, user_slug, display_name, accent_color)
values
  ('REPLACE_WITH_LONG_SECRET_FOR_JOEY', 'joey', 'Joey', '#678a5b'),
  ('REPLACE_WITH_LONG_SECRET_FOR_JESZI', 'jeszi', 'Jeszi', '#8661a9')
on conflict (user_slug) do update
set
  tile_key = excluded.tile_key,
  display_name = excluded.display_name,
  accent_color = excluded.accent_color,
  is_active = true;

-- Optional smoke-test data
insert into public.check_ins (from_user_slug, notification_sent, notification_result)
values ('joey', false, 'seed');

insert into public.notes (from_user_slug, content)
values ('jeszi', 'A first little note, just to make sure this place is awake.');

insert into public.note_reactions (note_id, from_user_slug, reaction)
select n.id, 'joey', '❤️'
from public.notes n
where n.from_user_slug = 'jeszi'
order by n.created_at desc
limit 1
on conflict do nothing;

insert into public.urgent_signals (from_user_slug, notification_sent, notification_result, confirmed_by_user)
values ('joey', false, 'seed', true);
