alter table public.payment_settings add column qr_image text;
comment on column public.payment_settings.qr_path is 'DEPRECATED: replaced by qr_image (inline image data URL); no storage bucket is used for the payment QR';

drop function public.public_payment_settings();
create function public.public_payment_settings()
returns table (upi_id text, gpay_number text, payee_name text, qr_image text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select upi_id, gpay_number, payee_name, qr_image, updated_at from public.payment_settings where id = true
$$;
grant execute on function public.public_payment_settings() to anon, authenticated;

drop policy if exists "Admins manage payment assets" on storage.objects;