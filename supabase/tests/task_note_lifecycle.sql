-- Optional SQL Editor regression check AFTER migration 20260929000003.
-- All fixtures are created in this transaction and rolled back.
begin;
set local role anon;
do $$
declare t jsonb; kept uuid; removed uuid; result jsonb; before_count bigint;
begin
  t := public.create_task_with_notes(
    jsonb_build_object('title', 'Cocoon regression fixture', 'priority', 'medium'),
    '[{"content":"Keep this","add_to_clipboard":false}]'::jsonb);
  select id into kept from public.notes where task_id = (t->>'id')::uuid;
  result := public.delete_task_with_notes((t->>'id')::uuid, null);
  if result->>'status' <> 'notes_choice_required' then raise exception 'Choice was not required'; end if;
  result := public.delete_task_with_notes((t->>'id')::uuid, 'keep');
  if result->>'status' <> 'deleted' then raise exception 'Task not deleted'; end if;
  if not exists(select 1 from public.notes where id=kept and task_id is null and source_task_title='Cocoon regression fixture') then
    raise exception 'Note was not preserved with its source title';
  end if;
  t := public.create_task_with_notes('{"title":"Delete fixture"}', '[{"content":"Remove this"}]');
  select id into removed from public.notes where task_id = (t->>'id')::uuid;
  perform public.delete_task_with_notes((t->>'id')::uuid, 'delete');
  if exists(select 1 from public.notes where id=removed) then raise exception 'Note was not deleted'; end if;
  if not exists(select 1 from public.notes where id=kept) then raise exception 'Unrelated note was removed'; end if;
  select count(*) into before_count from public.tasks;
  begin
    perform public.create_task_with_notes('{"title":"Must roll back"}', '[{"content":""}]');
    raise exception 'Invalid initial note was accepted';
  exception when invalid_parameter_value then null;
  end;
  if (select count(*) from public.tasks) <> before_count then raise exception 'Failed creation left a task behind'; end if;
  raise notice 'Task-note lifecycle checks passed; fixtures will be rolled back.';
end;
$$;
rollback;
