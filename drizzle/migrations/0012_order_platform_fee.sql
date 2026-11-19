begin;
-- Existing orders keep their original amount, with no retrospectively added fee.
alter table public.orders add column if not exists subtotal_amount numeric;
alter table public.orders add column if not exists platform_fee_amount numeric not null default 0;
alter table public.orders add column if not exists platform_fee_rate_bps integer not null default 0;
update public.orders set subtotal_amount = total_amount - platform_fee_amount where subtotal_amount is null;
-- Nullable subtotal permits old application instances to finish during deployment.
-- All new-version orders explicitly persist all three amount components.
comment on column public.orders.platform_fee_amount is 'BOSS PrintGo merchant online-order fee, included in total_amount; not Razorpay actual settlement fee';
comment on column public.orders.platform_fee_rate_bps is 'Rate snapshot in basis points, 250 = 2.5%; existing orders stay at zero';
commit;
