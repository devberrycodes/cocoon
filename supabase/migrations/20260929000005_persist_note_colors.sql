-- Run after migration 00004 in Supabase SQL Editor, not with the public key.
begin;
alter table public.notes add column if not exists color text default 'cream';
update public.notes set color = 'cream' where color is null;
alter table public.notes alter column color set default 'cream';
alter table public.notes alter column color set not null;
alter table public.notes add constraint notes_color_check check (color in ('cream', 'pink', 'sage'));

create or replace function public.save_note_with_clipboard(p_note_id uuid, p_fields jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  saved public.notes%rowtype;
  target_id uuid;
  source_title text;
  note_content text;
  note_color text;
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
  note_color := case when p_fields ? 'color' then p_fields->>'color' else coalesce(saved.color, 'cream') end;
  if note_color is null or note_color not in ('cream', 'pink', 'sage') then
    raise exception 'Invalid note color' using errcode = '22023';
  end if;
  if target_id is null then raise exception 'Task required' using errcode = '22023'; end if;
  select title into source_title from public.tasks where id = target_id for key share;
  if not found then raise exception 'Task not found' using errcode = '23503'; end if;
  if p_note_id is null then
    insert into public.notes(content, task_id, color) values(note_content, target_id, note_color) returning * into saved;
  else
    update public.notes set content = note_content, task_id = target_id, color = note_color, updated_at = now()
      where id = p_note_id returning * into saved;
    if not found then raise exception 'Note update denied' using errcode = '42501'; end if;
  end if;
  insert into public.notes(content, task_id, source_task_title, color) values(note_content, null, source_title, note_color);
  return to_jsonb(saved);
end;
$$;

revoke all on function public.save_note_with_clipboard(uuid, jsonb) from public;
grant execute on function public.save_note_with_clipboard(uuid, jsonb) to anon;
commit;
