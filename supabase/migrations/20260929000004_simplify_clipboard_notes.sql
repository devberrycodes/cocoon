-- Apply once in Supabase SQL Editor. Uses invoker permissions and existing RLS.
begin;

alter table public.notes add column if not exists source_task_title text;
alter table public.notes alter column task_id drop not null;

-- Repair the live task_id relationship even if its constraint has another name.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.notes'::regclass and confrelid = 'public.tasks'::regclass
      and contype = 'f'
      and conkey = array[(select attnum from pg_attribute
        where attrelid = 'public.notes'::regclass and attname = 'task_id')]::smallint[]
  loop
    execute format('alter table public.notes drop constraint %I', constraint_name);
  end loop;
  alter table public.notes add constraint notes_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade;
end;
$$;

-- Initial notes and task are created together. A failed note rolls back the task.
create or replace function public.create_task_with_notes(p_task jsonb, p_notes jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  created public.tasks%rowtype;
  item jsonb;
  note_content text;
  clipboard boolean;
  title_text text := btrim(p_task->>'title');
  due date := (p_task->>'due_date')::date;
begin
  if title_text is null or char_length(title_text) not between 1 and 200 then
    raise exception 'Invalid title' using errcode = '22023';
  end if;
  if coalesce(p_task->>'priority', 'medium') not in ('low', 'medium', 'high') then
    raise exception 'Invalid priority' using errcode = '22023';
  end if;
  if due < (now() at time zone 'UTC')::date then
    raise exception 'Due date cannot be in the past' using errcode = '22023';
  end if;
  if p_notes is null or jsonb_typeof(p_notes) <> 'array' then
    raise exception 'Notes must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_notes) > 50 then
    raise exception 'Too many initial notes' using errcode = '22023';
  end if;
  insert into public.tasks(title, description, completed, priority, due_date)
    values(title_text, p_task->>'description', false, coalesce(p_task->>'priority', 'medium'), due)
    returning * into created;
  for item in select value from jsonb_array_elements(p_notes) loop
    note_content := btrim(item->>'content');
    if jsonb_typeof(item->'content') is distinct from 'string' or note_content is null
      or char_length(note_content) not between 1 and 10000 then
      raise exception 'Invalid note content' using errcode = '22023';
    end if;
    if item ? 'add_to_clipboard' and jsonb_typeof(item->'add_to_clipboard') <> 'boolean' then
      raise exception 'Invalid clipboard option' using errcode = '22023';
    end if;
    clipboard := coalesce((item->>'add_to_clipboard')::boolean, false);
    insert into public.notes(content, task_id, source_task_title)
      values(note_content, created.id, null);
    if clipboard then
      insert into public.notes(content, task_id, source_task_title)
        values(note_content, null, created.title);
    end if;
  end loop;
  return to_jsonb(created);
end;
$$;

-- Clipboard copies are independent snapshots, not linked or synchronised notes.
create or replace function public.save_note_with_clipboard(p_note_id uuid, p_fields jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  saved public.notes%rowtype;
  target_id uuid;
  source_title text;
  note_content text;
begin
  if p_note_id is not null then
    select * into saved from public.notes where id = p_note_id for update;
    if not found then return null; end if;
  end if;
  target_id := case when p_fields ? 'task_id' then (p_fields->>'task_id')::uuid else saved.task_id end;
  note_content := case when p_fields ? 'content' then btrim(p_fields->>'content') else saved.content end;
  if note_content is null or char_length(note_content) not between 1 and 10000 then
    raise exception 'Invalid note content' using errcode = '22023';
  end if;
  if target_id is null then raise exception 'Task required' using errcode = '22023'; end if;
  select title into source_title from public.tasks where id = target_id for key share;
  if not found then raise exception 'Task not found' using errcode = '23503'; end if;
  if p_note_id is null then
    insert into public.notes(content, task_id) values(note_content, target_id) returning * into saved;
  else
    update public.notes set content = note_content, task_id = target_id, updated_at = now()
      where id = p_note_id returning * into saved;
    if not found then raise exception 'Note update denied' using errcode = '42501'; end if;
  end if;
  insert into public.notes(content, task_id, source_task_title) values(note_content, null, source_title);
  return to_jsonb(saved);
end;
$$;

-- Remove the obsolete keep/delete RPC; deletion now uses the foreign key.
drop function if exists public.delete_task_with_notes(uuid, text);
revoke all on function public.create_task_with_notes(jsonb, jsonb) from public;
revoke all on function public.save_note_with_clipboard(uuid, jsonb) from public;
grant execute on function public.create_task_with_notes(jsonb, jsonb) to anon;
grant execute on function public.save_note_with_clipboard(uuid, jsonb) to anon;
commit;
