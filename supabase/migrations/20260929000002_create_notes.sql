begin;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  content text not null check (char_length(btrim(content)) between 1 and 10000),
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_task_created_idx on public.notes (task_id, created_at desc);
alter table public.notes enable row level security;
-- Matches the current shared, no-auth task model; notes are not private.
grant select, insert, update, delete on public.notes to anon;
create policy "cocoon_anon_select_notes" on public.notes for select to anon using (true);
create policy "cocoon_anon_insert_notes" on public.notes for insert to anon with check (true);
create policy "cocoon_anon_update_notes" on public.notes for update to anon using (true) with check (true);
create policy "cocoon_anon_delete_notes" on public.notes for delete to anon using (true);

create function public.set_note_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger notes_updated_at before update on public.notes
for each row execute function public.set_note_updated_at();

commit;
