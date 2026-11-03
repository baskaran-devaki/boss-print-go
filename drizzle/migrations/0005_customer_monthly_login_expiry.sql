ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS session_expires_at timestamptz;
UPDATE public.customers SET session_expires_at = ((date_trunc('month', last_login_at AT TIME ZONE 'Asia/Kolkata') + interval '1 month') AT TIME ZONE 'Asia/Kolkata');
COMMENT ON COLUMN public.customers.session_expires_at IS 'Active guest login until next month midnight Asia/Kolkata; NULL after explicit logout.';
CREATE INDEX IF NOT EXISTS customers_active_expiry_idx ON public.customers(session_expires_at);