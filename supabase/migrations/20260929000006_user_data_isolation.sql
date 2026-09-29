-- Run this entire file in Supabase SQL Editor after migrations 00000–00005.
-- Enable Anonymous Sign-Ins in Supabase Authentication settings as well.
begin;

alter table public.tasks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.notes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.tasks alter column user_id set default auth.uid();
alter table public.notes alter column user_id set default auth.uid();
-- NOT VALID preserves old unowned rows, but rejects new unowned writes.
alter table public.tasks add constraint tasks_owner_required check (user_id is not null) not valid;
alter table public.notes add constraint notes_owner_required check (user_id is not null) not valid;
create index if not exists tasks_user_created_idx on public.tasks(user_id, created_at desc);
create index if not exists notes_user_created_idx on public.notes(user_id, created_at desc);
create index if not exists notes_user_task_idx on public.notes(user_id, task_id);
alter table public.tasks enable row level security;
alter table public.notes enable row level security;

-- Permissive policies combine with OR, so remove ALL previous policies on these tables.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('tasks', 'notes')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

revoke all on public.tasks, public.notes from anon;
grant select, insert, update, delete on public.tasks, public.notes to authenticated;

create policy tasks_select_own on public.tasks for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks for delete to authenticated using ((select auth.uid()) = user_id);
create policy notes_select_own on public.notes for select to authenticated using ((select auth.uid()) = user_id);
create policy notes_insert_own on public.notes for insert to authenticated with check (
  (select auth.uid()) = user_id and (task_id is null or exists (
    select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())
  ))
);
create policy notes_update_own on public.notes for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and (task_id is null or exists (
    select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid())
  ))
);
create policy notes_delete_own on public.notes for delete to authenticated using ((select auth.uid()) = user_id);

-- These existing functions omit user_id in inserts: the auth.uid() defaults above
-- assign ownership to tasks, task notes and clipboard copies atomically.
-- Invoker security makes every internal query obey the caller's RLS policies.
alter function public.create_task_with_notes(jsonb, jsonb) security invoker;
alter function public.save_note_with_clipboard(uuid, jsonb) security invoker;
revoke all on function public.create_task_with_notes(jsonb, jsonb) from public, anon;
revoke all on function public.save_note_with_clipboard(uuid, jsonb) from public, anon;
grant execute on function public.create_task_with_notes(jsonb, jsonb) to authenticated;
grant execute on function public.save_note_with_clipboard(uuid, jsonb) to authenticated;
commit;
