begin;
alter table public.orders add column if not exists picked_up_at timestamptz;
alter table public.orders add column if not exists files_deleted_at timestamptz;
-- Old pickup timestamps cannot be reconstructed reliably. Give these orders a full grace period.
update public.orders set picked_up_at = now() where order_status = 'picked_up' and picked_up_at is null;
create or replace function public.stamp_order_pickup() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.picked_up_at := case when new.order_status = 'picked_up' then now() else null end;
    new.files_deleted_at := null;
  else
    -- First pickup is immutable; later status/payment edits cannot extend retention.
    new.picked_up_at := old.picked_up_at;
    if old.picked_up_at is null and new.order_status = 'picked_up' then new.picked_up_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists orders_stamp_pickup on public.orders;
create trigger orders_stamp_pickup before insert or update on public.orders for each row execute function public.stamp_order_pickup();
create index if not exists orders_uploads_cleanup_due on public.orders(picked_up_at) where files_deleted_at is null and picked_up_at is not null;

create or replace function public.track_order(_token text)
returns table (order_code text, payment_status public.payment_status, order_status public.order_status, total_amount numeric, total_sides bigint, pages integer, copies integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select order_code, payment_status, order_status, total_amount, total_sides, pages, copies, created_at
  from public.orders where tracking_token = _token
    and (payment_provider <> 'razorpay' or (payment_status = 'verified' and razorpay_payment_id is not null))
    and (picked_up_at is null or picked_up_at > now() - interval '24 hours')
$$;

-- Only our admin-authorised server function can request these upload references.
-- Clamp signed links to the remaining retention window, even before physical cleanup runs.
create or replace function public.live_order_uploads(_paths text[])
returns table(path text, ttl integer)
language sql stable security definer set search_path = public as $$
  select requested.path, min(case when o.picked_up_at is null then 600
    else least(600, floor(extract(epoch from (o.picked_up_at + interval '24 hours' - now())))::integer) end)::integer
  from unnest(_paths) as requested(path)
  join public.orders o on (o.file_paths ? requested.path or o.screenshot_path = requested.path)
  where o.files_deleted_at is null
    and (o.picked_up_at is null or o.picked_up_at > now() - interval '24 hours')
    and (o.payment_provider <> 'razorpay' or (o.payment_status = 'verified' and o.razorpay_payment_id is not null))
  group by requested.path
$$;
revoke all on function public.live_order_uploads(text[]) from public, anon, authenticated;
grant execute on function public.live_order_uploads(text[]) to service_role;
commit;
