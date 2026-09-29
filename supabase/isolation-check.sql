-- Optional SQL Editor verification AFTER 00006. All fixtures roll back.
begin;
insert into auth.users(id) values
 ('a0000000-0000-4000-8000-000000000001'), ('b0000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
insert into public.tasks(id,title) values ('c0000000-0000-4000-8000-000000000001','RLS test task');
insert into public.notes(id,content,task_id) values ('d0000000-0000-4000-8000-000000000001','RLS test note','c0000000-0000-4000-8000-000000000001');
do $$ begin
  if not exists(select 1 from public.tasks where id='c0000000-0000-4000-8000-000000000001') then raise exception 'Owner task read failed'; end if;
  if not exists(select 1 from public.notes where id='d0000000-0000-4000-8000-000000000001') then raise exception 'Owner note read failed'; end if;
end $$;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
do $$ declare n integer; begin
  if exists(select 1 from public.tasks where id='c0000000-0000-4000-8000-000000000001') then raise exception 'Task read leak'; end if;
  if exists(select 1 from public.notes where id='d0000000-0000-4000-8000-000000000001') then raise exception 'Note read leak'; end if;
  update public.tasks set title='wrong' where id='c0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count; if n <> 0 then raise exception 'Task update leak'; end if;
  update public.notes set content='wrong' where id='d0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count; if n <> 0 then raise exception 'Note update leak'; end if;
  delete from public.notes where id='d0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count; if n <> 0 then raise exception 'Note delete leak'; end if;
  delete from public.tasks where id='c0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count; if n <> 0 then raise exception 'Task delete leak'; end if;
  begin
    insert into public.tasks(title,user_id) values('spoof','a0000000-0000-4000-8000-000000000001');
    raise exception 'Ownership spoof allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.notes(content,task_id) values('wrong task','c0000000-0000-4000-8000-000000000001');
    raise exception 'Cross-owner note link allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
