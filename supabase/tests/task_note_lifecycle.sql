-- Optional SQL Editor regression check AFTER migration 20260929000004.
-- Fixtures are transaction-local; nothing is kept after ROLLBACK.
begin;
set local role anon;
do $$
declare t jsonb; task_note uuid; copied uuid; general uuid; result jsonb; before_count bigint;
begin
  t := public.create_task_with_notes(
    '{"title":"Cocoon regression fixture","description":"Task description","priority":"high"}',
    '[{"content":"Initial note","add_to_clipboard":true}]');
  select id into task_note from public.notes where task_id = (t->>'id')::uuid;
  select id into copied from public.notes where task_id is null and source_task_title = 'Cocoon regression fixture' and content = 'Initial note';
  if task_note is null or copied is null or task_note = copied then raise exception 'Expected task note and independent copy'; end if;
  insert into public.notes(content) values('Unrelated general fixture') returning id into general;
  result := public.save_note_with_clipboard(task_note, '{"content":"Updated task note"}');
  if result->>'content' <> 'Updated task note' or (result->>'task_id')::uuid <> (t->>'id')::uuid then
    raise exception 'Task note was not updated in place';
  end if;
  if not exists(select 1 from public.notes where id=copied and content='Initial note') then
    raise exception 'Existing independent copy changed';
  end if;
  delete from public.tasks where id = (t->>'id')::uuid;
  if exists(select 1 from public.notes where task_id=(t->>'id')::uuid or id=task_note) then
    raise exception 'Task notes did not cascade';
  end if;
  if not exists(select 1 from public.notes where id=copied) or not exists(select 1 from public.notes where id=general) then
    raise exception 'Clipboard notes were removed';
  end if;
  select count(*) into before_count from public.tasks;
  begin
    perform public.create_task_with_notes('{"title":"Must roll back"}', '[{"content":""}]');
    raise exception 'Invalid note accepted';
  exception when invalid_parameter_value then null;
  end;
  if (select count(*) from public.tasks) <> before_count then raise exception 'Failed creation left a task'; end if;
  raise notice 'Clipboard lifecycle checks passed; fixtures will be rolled back.';
end;
$$;
rollback;
