create table recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  storage_path text not null unique,
  public_url text,
  file_size integer check (file_size > 0),
  mime_type text,
  duration_seconds numeric(8,2) check (duration_seconds > 0),
  created_at timestamptz not null default now()
);

create index recordings_user_id_created_at_idx on recordings (user_id, created_at desc);
