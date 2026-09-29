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
    foreign key (task_id) references public.tasks(id) on delete set null;
end;
$$;

create or replace function public.delete_task_with_notes(p_task_id uuid, p_note_action text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target public.tasks%rowtype;
  note_count integer;
  affected integer := 0;
begin
  if p_note_action is not null and p_note_action not in ('keep', 'delete') then
    raise exception 'Invalid note action' using errcode = '22023';
  end if;
  -- Locks the parent against concurrent note attachment while deciding/deleting.
  select * into target from public.tasks where id = p_task_id for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  select count(*) into note_count from public.notes where task_id = p_task_id;
  if note_count > 0 and p_note_action is null then
    return jsonb_build_object('status', 'notes_choice_required');
  end if;
  if p_note_action = 'keep' then
    update public.notes set task_id = null, source_task_title = target.title
      where task_id = p_task_id;
    get diagnostics affected = row_count;
  elsif p_note_action = 'delete' then
    delete from public.notes where task_id = p_task_id;
    get diagnostics affected = row_count;
  end if;
  if affected <> note_count then
    raise exception 'Note operation denied' using errcode = '42501';
  end if;
  delete from public.tasks where id = p_task_id;
  if not found then raise exception 'Task deletion denied' using errcode = '42501'; end if;
  return jsonb_build_object('status', 'deleted', 'note_count', note_count);
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
      values(note_content, case when clipboard then null else created.id end,
        case when clipboard then created.title else null end);
  end loop;
  return to_jsonb(created);
end;
$$;

revoke all on function public.delete_task_with_notes(uuid, text) from public;
revoke all on function public.create_task_with_notes(jsonb, jsonb) from public;
grant execute on function public.delete_task_with_notes(uuid, text) to anon;
grant execute on function public.create_task_with_notes(jsonb, jsonb) to anon;

commit;
