
revoke all on public.memories from anon,authenticated;
grant select on public.memories to authenticated;
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke all on public.memory_attachments from anon,authenticated;

create unique index if not exists notifications_one_unlock_per_memory
  on public.notifications(memory_id,type)
  where memory_id is not null and type='memory_unlocked';

create extension if not exists pg_cron with schema pg_catalog;
do $$
begin
  if not exists (select 1 from cron.job where jobname='everstar-capsule-unlock-notifications') then
    perform cron.schedule(
      'everstar-capsule-unlock-notifications','* * * * *',
      $job$
        insert into public.notifications(user_id,memory_id,type,title,body)
        select m.user_id,m.id,'memory_unlocked','A time capsule has opened',
          'One of your saved memories is ready to revisit.'
        from public.memories m
        where m.unlock_at is not null and m.unlock_at <= now()
        on conflict (memory_id,type) where memory_id is not null and type='memory_unlocked'
        do nothing;
      $job$
    );
  end if;
end
$$;
