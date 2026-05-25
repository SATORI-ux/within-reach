alter table public.notes
  add column if not exists notification_sent boolean not null default false,
  add column if not exists notification_result text;
