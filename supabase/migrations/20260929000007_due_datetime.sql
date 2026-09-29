-- Run in SQL Editor after 00006. Existing date-only values are interpreted as UTC midnight.
begin;
do $$
declare kind text;
begin
  select data_type into kind from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='due_date';
  if kind in ('date', 'timestamp without time zone') then
    alter table public.tasks alter column due_date type timestamptz using due_date::timestamp at time zone 'UTC';
  elsif kind is distinct from 'timestamp with time zone' then
    raise exception 'Unexpected due_date type: %', kind;
  end if;
end $$;
create or replace function public.create_task_with_notes(p_task jsonb, p_notes jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  created public.tasks%rowtype;
  item jsonb;
  note_content text;
  clipboard boolean;
  title_text text := btrim(p_task->>'title');
  due timestamptz := (p_task->>'due_date')::timestamptz;
begin
  if title_text is null or char_length(title_text) not between 1 and 200 then
    raise exception 'Invalid title' using errcode = '22023';
  end if;
  if coalesce(p_task->>'priority', 'medium') not in ('low', 'medium', 'high') then
    raise exception 'Invalid priority' using errcode = '22023';
  end if;
  if due < date_trunc('minute', now()) then
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

commit;
