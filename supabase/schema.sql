-- Chispa — Esquema PostgreSQL + RLS + Realtime para Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase.

create table if not exists public.folders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  section text not null default 'projects' check (section in ('recent', 'projects')),
  color text not null default 'terracotta' check (color in ('terracotta', 'sage', 'sky', 'lavender', 'amber', 'stone')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table if not exists public.ideas (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid null references public.folders(id) on delete set null,
  title text not null,
  body text not null default '',
  notes text not null default '',
  kind text not null default 'idea' check (kind in ('idea', 'feature', 'ux', 'bug')),
  status text not null default 'inbox' check (status in ('inbox', 'shaping', 'ready', 'done', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  tags text[] not null default '{}'::text[],
  checklist jsonb not null default '[]'::jsonb,
  cover_image_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

-- Índices para sincronización incremental rápida por usuario
create index if not exists idx_folders_user_updated
  on public.folders (user_id, updated_at desc);

create index if not exists idx_ideas_user_updated
  on public.ideas (user_id, updated_at desc);

create index if not exists idx_ideas_user_folder
  on public.ideas (user_id, folder_id);

-- Permisos explícitos para usuarios autenticados y RLS obligatorio
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.ideas to authenticated;

alter table public.folders enable row level security;
alter table public.ideas enable row level security;

-- Políticas para folders
drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own"
  on public.folders for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own"
  on public.folders for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own"
  on public.folders for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own"
  on public.folders for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Políticas para ideas
drop policy if exists "ideas_select_own" on public.ideas;
create policy "ideas_select_own"
  on public.ideas for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "ideas_insert_own" on public.ideas;
create policy "ideas_insert_own"
  on public.ideas for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "ideas_update_own" on public.ideas;
create policy "ideas_update_own"
  on public.ideas for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "ideas_delete_own" on public.ideas;
create policy "ideas_delete_own"
  on public.ideas for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Habilitar Realtime para sincronización instantánea entre teléfono y PC
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'folders'
  ) then
    alter publication supabase_realtime add table public.folders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ideas'
  ) then
    alter publication supabase_realtime add table public.ideas;
  end if;
end $$;
