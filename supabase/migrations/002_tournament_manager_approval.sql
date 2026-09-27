-- Tournament-manager approval gate. Apply this migration in the Supabase SQL Editor before deploying.
create table if not exists public.tournament_manager_approval (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  review_note text
);
create index if not exists tournament_manager_approval_status_idx on public.tournament_manager_approval(status, requested_at desc);
alter table public.tournament_manager_approval enable row level security;
-- Access is intentionally mediated by the backend service role; do not grant anon/authenticated table access.
