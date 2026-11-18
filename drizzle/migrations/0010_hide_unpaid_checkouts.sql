begin;
-- Keep gateway checkout drafts available to the verified webhook/service role,
-- but never expose unpaid drafts to the admin order list or customer tracking.
drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders" on public.orders for select to authenticated
using (public.has_role(auth.uid(), 'admin') and (payment_provider <> 'razorpay' or (payment_status = 'verified' and razorpay_payment_id is not null)));
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated
using (public.has_role(auth.uid(), 'admin') and (payment_provider <> 'razorpay' or (payment_status = 'verified' and razorpay_payment_id is not null)))
with check (public.has_role(auth.uid(), 'admin') and (payment_provider <> 'razorpay' or (payment_status = 'verified' and razorpay_payment_id is not null)));
create or replace function public.track_order(_token text)
returns table (order_code text, payment_status public.payment_status, order_status public.order_status, total_amount numeric, total_sides bigint, pages integer, copies integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select order_code, payment_status, order_status, total_amount, total_sides, pages, copies, created_at
  from public.orders where tracking_token = _token
    and (payment_provider <> 'razorpay' or (payment_status = 'verified' and razorpay_payment_id is not null))
$$;
commit;
