
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('customer', 'center_owner', 'admin');
CREATE TYPE public.service_category AS ENUM ('laser','filler','botox','facial','hair','nails','massage','other');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','completed','cancelled');
CREATE TYPE public.subscription_plan AS ENUM ('free','basic','pro','premium');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ CENTERS ============
CREATE TABLE public.centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  slug text NOT NULL UNIQUE,
  description text,
  description_ar text,
  city text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  logo_url text,
  cover_url text,
  commission_rate double precision NOT NULL DEFAULT 10,
  subscription_plan public.subscription_plan NOT NULL DEFAULT 'free',
  subscription_expires_at timestamptz,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  rating_avg double precision NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_centers_city ON public.centers(city);
CREATE INDEX idx_centers_active ON public.centers(is_active, is_verified);

-- ============ SERVICES ============
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  category public.service_category NOT NULL DEFAULT 'other',
  description text,
  price double precision NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_services_center ON public.services(center_id);
CREATE INDEX idx_services_category ON public.services(category);

-- ============ BOOKINGS ============
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  price_paid double precision NOT NULL DEFAULT 0,
  commission_rate double precision NOT NULL DEFAULT 10,
  commission_amount double precision NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_center ON public.bookings(center_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- Auto commission calc
CREATE OR REPLACE FUNCTION public.calc_booking_commission()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.commission_amount := ROUND((NEW.price_paid * NEW.commission_rate / 100)::numeric, 2);
  RETURN NEW;
END;
$$;
CREATE TRIGGER booking_commission_trg
BEFORE INSERT OR UPDATE OF price_paid, commission_rate ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.calc_booking_commission();

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reviews_center ON public.reviews(center_id);

-- Update center rating on review change
CREATE OR REPLACE FUNCTION public.refresh_center_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c_id uuid;
BEGIN
  c_id := COALESCE(NEW.center_id, OLD.center_id);
  UPDATE public.centers
  SET rating_avg = COALESCE((SELECT AVG(rating)::float FROM public.reviews WHERE center_id = c_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.reviews WHERE center_id = c_id)
  WHERE id = c_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER review_rating_trg
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_center_rating();

-- ============ NEW USER HANDLER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  desired_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  desired_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'center_owner' THEN 'center_owner'::public.app_role
    ELSE 'customer'::public.app_role
  END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, desired_role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Profiles viewable by owner or admin" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- centers
CREATE POLICY "Active verified centers public" ON public.centers
FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Owner manages center" ON public.centers
FOR ALL TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- services
CREATE POLICY "Active services public" ON public.services
FOR SELECT TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Center owner manages services" ON public.services
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.centers c WHERE c.id = services.center_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.centers c WHERE c.id = services.center_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- bookings
CREATE POLICY "Customer views own bookings" ON public.bookings
FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.centers c WHERE c.id = bookings.center_id AND c.owner_id = auth.uid())
);

CREATE POLICY "Customer creates own bookings" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customer or center updates bookings" ON public.bookings
FOR UPDATE TO authenticated
USING (
  customer_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.centers c WHERE c.id = bookings.center_id AND c.owner_id = auth.uid())
);

-- reviews
CREATE POLICY "Reviews public" ON public.reviews
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Customer reviews own completed booking" ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
  customer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = reviews.booking_id
      AND b.customer_id = auth.uid()
      AND b.status = 'completed'
  )
);

CREATE POLICY "Customer updates own review" ON public.reviews
FOR UPDATE TO authenticated USING (customer_id = auth.uid());

CREATE POLICY "Customer deletes own review or admin" ON public.reviews
FOR DELETE TO authenticated
USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
