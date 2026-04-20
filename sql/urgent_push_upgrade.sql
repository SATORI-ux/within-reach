alter table public.urgent_signals
  add column if not exists signal_id uuid not null default gen_random_uuid(),
  add column if not exists preferred_response text not null default 'either',
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by text references public.tile_keys(user_slug) on update cascade,
  add column if not exists status text not null default 'pending';

create unique index if not exists urgent_signals_signal_id_key
  on public.urgent_signals (signal_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'urgent_signals_preferred_response_check'
  ) then
    alter table public.urgent_signals
      add constraint urgent_signals_preferred_response_check
      check (preferred_response in ('call', 'text', 'either'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'urgent_signals_status_check'
  ) then
    alter table public.urgent_signals
      add constraint urgent_signals_status_check
      check (status in ('pending', 'acknowledged'));
  end if;
end $$;

create index if not exists idx_urgent_signals_signal_id
  on public.urgent_signals (signal_id);

create index if not exists idx_urgent_signals_status
  on public.urgent_signals (status);
