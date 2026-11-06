CREATE TABLE public.binding_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_pages integer NOT NULL CHECK (min_pages >= 1),
  max_pages integer NOT NULL CHECK (max_pages >= min_pages AND max_pages <= 100000),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.binding_prices TO authenticated;
GRANT ALL ON public.binding_prices TO service_role;
ALTER TABLE public.binding_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage binding prices" ON public.binding_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.customer_binding_prices() RETURNS TABLE(min_pages integer, max_pages integer, price numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT min_pages, max_pages, price FROM public.binding_prices ORDER BY min_pages
$$;
GRANT EXECUTE ON FUNCTION public.customer_binding_prices() TO anon, authenticated;

CREATE FUNCTION public.quote_binding(_pages integer) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT price FROM public.binding_prices WHERE _pages BETWEEN min_pages AND max_pages ORDER BY min_pages LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.quote_binding(integer) TO anon, authenticated;

ALTER TABLE public.orders ADD COLUMN spiral_binding boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN binding_amount numeric(10,2) NOT NULL DEFAULT 0;