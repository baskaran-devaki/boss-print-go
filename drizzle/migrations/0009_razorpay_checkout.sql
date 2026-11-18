begin;
alter table public.orders add column if not exists payment_provider text not null default 'manual';
alter table public.orders add column if not exists razorpay_order_id text;
alter table public.orders add column if not exists razorpay_payment_id text;
create unique index if not exists orders_razorpay_order_unique on public.orders(razorpay_order_id) where razorpay_order_id is not null;
create unique index if not exists orders_razorpay_payment_unique on public.orders(razorpay_payment_id) where razorpay_payment_id is not null;
-- Gateway orders remain pending until server verification of a captured payment.
commit;
