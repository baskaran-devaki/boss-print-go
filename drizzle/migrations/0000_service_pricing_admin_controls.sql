CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated, service_role;
CREATE POLICY "Read own role" ON public.user_roles FOR SELECT TO authenticated USING(user_id = auth.uid());
CREATE TABLE public.service_pricing (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service text NOT NULL CHECK(service IN ('xerox','printout')), paper_size text NOT NULL DEFAULT 'A4' CHECK(paper_size IN ('A4','A3')), color_mode text NOT NULL DEFAULT 'bw' CHECK(color_mode IN ('bw','color')), standard_rate numeric(10,2) NOT NULL CHECK(standard_rate > 0), bulk_rate numeric(10,2) NOT NULL CHECK(bulk_rate > 0), bulk_threshold integer NOT NULL DEFAULT 50 CHECK(bulk_threshold >= 1), available boolean NOT NULL DEFAULT true, UNIQUE(service,paper_size,color_mode));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.service_pricing TO authenticated;
GRANT ALL ON public.service_pricing TO service_role;
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin pricing CRUD" ON public.service_pricing FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.customer_pricing() RETURNS TABLE(id uuid,service text,paper_size text,color_mode text,standard_rate numeric,bulk_rate numeric,bulk_threshold integer,available boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT id,service,paper_size,color_mode,standard_rate,bulk_rate,bulk_threshold,available FROM public.service_pricing WHERE available = true ORDER BY service,paper_size,color_mode $$;
REVOKE ALL ON FUNCTION public.customer_pricing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_pricing() TO anon,authenticated,service_role;
CREATE FUNCTION public.quote_print(_service text,_paper_size text,_color_mode text,_pages integer,_copies integer) RETURNS TABLE(total_sides bigint,applicable_rate numeric,total_amount numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.service_pricing; n bigint; r numeric;
BEGIN
IF _pages IS NULL OR _copies IS NULL OR _pages < 1 OR _copies < 1 OR _pages > 100000 OR _copies > 10000 THEN RAISE EXCEPTION 'Invalid pages or copies'; END IF;
SELECT * INTO p FROM public.service_pricing WHERE service = _service AND paper_size = _paper_size AND color_mode = _color_mode AND available = true;
IF NOT FOUND THEN RAISE EXCEPTION 'Service or print option unavailable'; END IF;
n := _pages::bigint * _copies; r := CASE WHEN n >= p.bulk_threshold THEN p.bulk_rate ELSE p.standard_rate END;
RETURN QUERY SELECT n,r,round(n*r,2);
END $$;
REVOKE ALL ON FUNCTION public.quote_print(text,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_print(text,text,text,integer,integer) TO anon,authenticated,service_role;