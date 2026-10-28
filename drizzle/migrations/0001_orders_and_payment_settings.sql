create extension if not exists pgcrypto;

create type public.payment_status as enum ('pending_verification', 'verified', 'rejected');
create type public.order_status as enum ('received', 'printing', 'ready', 'picked_up');

create table public.payment_settings (
  id boolean primary key default true check (id = true),
  upi_id text not null default '',
  gpay_number text not null default '',
  payee_name text not null default 'BOSS PrintGo',
  qr_path text,
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id, upi_id, gpay_number) values (true, '8754745474@upi', '8754745474') on conflict (id) do nothing;

create sequence public.order_code_seq start 2000;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default ('BPG-' || nextval('public.order_code_seq')),
  tracking_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  customer_name text not null,
  mobile text,
  service text not null,
  paper_size text not null,
  color_mode text not null,
  pages integer not null check (pages >= 1),
  copies integer not null check (copies >= 1),
  total_sides bigint not null check (total_sides >= 1),
  total_amount numeric not null check (total_amount >= 0),
  utr text not null,
  file_paths jsonb not null default '[]'::jsonb,
  screenshot_path text,
  payment_status public.payment_status not null default 'pending_verification',
  order_status public.order_status not null default 'received',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.public_payment_settings()
returns table (upi_id text, gpay_number text, payee_name text, qr_path text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select upi_id, gpay_number, payee_name, qr_path, updated_at from public.payment_settings where id = true
$$;

create or replace function public.track_order(_token text)
returns table (order_code text, payment_status public.payment_status, order_status public.order_status, total_amount numeric, total_sides bigint, pages integer, copies integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select order_code, payment_status, order_status, total_amount, total_sides, pages, copies, created_at
  from public.orders where tracking_token = _token
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger orders_touch_updated_at before update on public.orders for each row execute function public.touch_updated_at();
create trigger payment_settings_touch_updated_at before update on public.payment_settings for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
grant select, insert, update, delete on public.payment_settings to authenticated;
grant all on public.payment_settings to service_role;
grant execute on function public.public_payment_settings() to anon, authenticated;
grant execute on function public.track_order(text) to anon, authenticated;

alter table public.orders enable row level security;
alter table public.payment_settings enable row level security;

create policy "Admins manage payment settings" on public.payment_settings
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Guests upload order files" on storage.objects for insert to anon with check (bucket_id = 'order-uploads');
create policy "Admins manage payment assets" on storage.objects for all to authenticated
  using (bucket_id = 'payment-assets' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'payment-assets' and public.has_role(auth.uid(), 'admin'));
