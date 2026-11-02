CREATE TABLE public.customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 mobile text,
 category text NOT NULL CHECK (category IN ('school_student','college_student','others')),
 session_hash text NOT NULL UNIQUE,
 login_count integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_login_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read customers" ON public.customers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.orders ADD COLUMN customer_id uuid REFERENCES public.customers(id);
CREATE INDEX orders_customer_created_idx ON public.orders(customer_id, created_at);
COMMENT ON TABLE public.customers IS 'Unverified guest identities, private server-issued session hashes; name or mobile must never grant identity access.';