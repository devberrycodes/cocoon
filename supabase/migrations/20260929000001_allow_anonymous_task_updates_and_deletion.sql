-- Extends Cocoon's shared no-auth task model. Anyone with the public project
-- key can update/delete visible tasks. Apply after the SELECT/INSERT migration.
begin;

alter table public.tasks enable row level security;
grant update, delete on table public.tasks to anon;

create policy "cocoon_anon_update_tasks"
  on public.tasks for update to anon
  using (true) with check (true);

create policy "cocoon_anon_delete_tasks"
  on public.tasks for delete to anon
  using (true);

commit;
