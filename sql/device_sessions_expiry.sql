alter table public.device_sessions
  add column if not exists expires_at timestamptz;

create index if not exists idx_device_sessions_expires_at
  on public.device_sessions (expires_at);
