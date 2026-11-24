-- Run the due-capsule processor every minute.
-- This inserts one in-app notification per capsule and marks it as processed.
create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'everstar-capsule-notifications') then
    perform cron.schedule(
      'everstar-capsule-notifications',
      '* * * * *',
      'select private.process_due_memories();'
    );
  end if;
end
$$;
