-- Cocoon's current no-auth model is a shared task list: anyone with the
-- public project key can read and create tasks. Revisit before private use.
-- Apply using the Supabase SQL Editor as the database owner.
begin;

alter table public.tasks enable row level security;

grant select, insert on table public.tasks to anon;

create policy "cocoon_anon_select_tasks"
  on public.tasks
  for select
  to anon
  using (true);

create policy "cocoon_anon_insert_tasks"
  on public.tasks
  for insert
  to anon
  with check (true);

commit;
