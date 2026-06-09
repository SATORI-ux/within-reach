create table if not exists public.secret_final_ask (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'hidden'
    check (status in ('hidden', 'revealed', 'answered')),
  response text
    check (response in ('yes', 'talk_first')),
  revealed_at timestamptz,
  revealed_by text references public.tile_keys(user_slug) on update cascade,
  responded_at timestamptz,
  responded_by text references public.tile_keys(user_slug) on update cascade,
  accepted_at timestamptz,
  reset_at timestamptz,
  reset_by text references public.tile_keys(user_slug) on update cascade,
  joey_celebration_seen_at timestamptz,
  jeszi_celebration_seen_at timestamptz,
  yes_notification_sent_at timestamptz,
  talk_first_notification_sent_at timestamptz,
  anniversary_enabled boolean not null default false,
  anniversary_timezone text,
  last_anniversary_sent_for_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_secret_final_ask_singleton
  on public.secret_final_ask ((true));

create index if not exists idx_secret_final_ask_status
  on public.secret_final_ask (status);

create index if not exists idx_secret_final_ask_accepted_at
  on public.secret_final_ask (accepted_at desc);

alter table public.secret_final_ask enable row level security;

comment on table public.secret_final_ask is
  'Dedicated state for the Quietly Kept Final Ask. Read and write through Edge Functions only.';

comment on column public.secret_final_ask.response is
  'Final Ask response. yes records accepted_at; talk_first is a safe non-punishing answered state.';
