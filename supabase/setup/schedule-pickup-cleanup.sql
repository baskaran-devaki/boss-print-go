-- Run AFTER deployment is Ready and after creating the Vault secret below.
-- In Supabase Vault create a secret named boss_file_cleanup_secret whose VALUE
-- exactly matches FILE_CLEANUP_SECRET in Vercel. Do not paste that value into chat/GitHub.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
  if (select count(*) from vault.secrets where name = 'boss_file_cleanup_secret') <> 1 then
    raise exception 'Create exactly one Vault secret named boss_file_cleanup_secret before scheduling cleanup';
  end if;
end $$;
select cron.schedule(
  'boss-printgo-pickup-cleanup',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://boss-print-go.vercel.app/api/cleanup-picked-up',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'boss_file_cleanup_secret' limit 1)),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
);
-- Job dispatch status is in cron.job_run_details. HTTP execution status is in net._http_response.
-- select id,status_code,error_msg,created from net._http_response order by created desc limit 10;
