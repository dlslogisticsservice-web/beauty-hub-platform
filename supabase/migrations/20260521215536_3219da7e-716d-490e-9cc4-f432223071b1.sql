-- Country fields
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'EG';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'EGP';

-- Subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  price_egp double precision NOT NULL DEFAULT 0,
  price_sar double precision NOT NULL DEFAULT 0,
  max_services integer NOT NULL DEFAULT 3,
  max_photos integer NOT NULL DEFAULT 2,
  appears_in_search boolean NOT NULL DEFAULT true,
  featured_badge boolean NOT NULL DEFAULT false,
  priority_rank integer NOT NULL DEFAULT 4,
  whatsapp_notifications boolean NOT NULL DEFAULT false,
  analytics_access boolean NOT NULL DEFAULT false,
  description_en text,
  description_ar text
);
INSERT INTO public.subscription_plans (id, name_en, name_ar, price_egp, price_sar, max_services, max_photos, appears_in_search, featured_badge, priority_rank, whatsapp_notifications, analytics_access, description_en, description_ar) VALUES
('free','Free','مجاني',0,0,3,2,false,false,4,false,false,'Get started for free','ابدأ مجاناً'),
('basic','Basic','أساسي',199,59,10,5,true,false,3,false,false,'Get listed in search','اظهر في نتائج البحث'),
('pro','Pro','احترافي',399,99,30,15,true,false,2,true,true,'Listed + analytics + WhatsApp','مع تحليلات وإشعارات'),
('premium','Premium','بريميوم',699,179,-1,-1,true,true,1,true,true,'Featured + top of search','مميز وفي أعلى البحث')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plans public read" ON public.subscription_plans;
CREATE POLICY "Plans public read" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage plans" ON public.subscription_plans;
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Commission tiers
CREATE TABLE IF NOT EXISTS public.commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate_percent double precision NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.commission_tiers (name, rate_percent, description)
SELECT * FROM (VALUES
  ('Standard',10::double precision,'Default tier for new centers'),
  ('Partner',8::double precision,'Reduced rate for partners'),
  ('VIP',5::double precision,'Top tier for VIP centers')
) AS v(name, rate_percent, description)
WHERE NOT EXISTS (SELECT 1 FROM public.commission_tiers);
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS commission_tier_id uuid REFERENCES public.commission_tiers(id);
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tiers public read" ON public.commission_tiers;
CREATE POLICY "Tiers public read" ON public.commission_tiers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage tiers" ON public.commission_tiers;
CREATE POLICY "Admins manage tiers" ON public.commission_tiers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Feature flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.feature_flags (key, enabled, description) VALUES
('whatsapp_notifications', false, 'Send WhatsApp on booking events'),
('payment_gateway', false, 'Online payment via Paymob'),
('mobile_app_api', false, 'REST endpoints for React Native app'),
('ai_recommendations', false, 'AI-based center recommendations')
ON CONFLICT (key) DO NOTHING;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Flags public read" ON public.feature_flags;
CREATE POLICY "Flags public read" ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Super admin manages flags" ON public.feature_flags;
CREATE POLICY "Super admin manages flags" ON public.feature_flags FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit" ON public.audit_logs;
CREATE POLICY "Admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Booking currency auto-fill
CREATE OR REPLACE FUNCTION public.set_booking_currency()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE c_country text;
BEGIN
  SELECT country INTO c_country FROM public.centers WHERE id = NEW.center_id;
  IF c_country = 'SA' THEN NEW.currency := 'SAR'; ELSE NEW.currency := 'EGP'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS booking_set_currency ON public.bookings;
CREATE TRIGGER booking_set_currency BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_currency();

DROP TRIGGER IF EXISTS booking_calc_commission ON public.bookings;
CREATE TRIGGER booking_calc_commission BEFORE INSERT OR UPDATE OF price_paid, commission_rate ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.calc_booking_commission();

DROP TRIGGER IF EXISTS reviews_refresh_rating ON public.reviews;
CREATE TRIGGER reviews_refresh_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_center_rating();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit trigger on centers
CREATE OR REPLACE FUNCTION public.log_center_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE actor_email text;
BEGIN
  SELECT email INTO actor_email FROM public.profiles WHERE id = auth.uid();
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      INSERT INTO public.audit_logs (actor_id, actor_email, action, target_type, target_id, old_value, new_value)
      VALUES (auth.uid(), actor_email, CASE WHEN NEW.is_verified THEN 'center.verified' ELSE 'center.unverified' END, 'center', NEW.id, jsonb_build_object('is_verified', OLD.is_verified), jsonb_build_object('is_verified', NEW.is_verified));
    END IF;
    IF OLD.commission_rate IS DISTINCT FROM NEW.commission_rate THEN
      INSERT INTO public.audit_logs (actor_id, actor_email, action, target_type, target_id, old_value, new_value)
      VALUES (auth.uid(), actor_email, 'commission.updated', 'center', NEW.id, jsonb_build_object('commission_rate', OLD.commission_rate), jsonb_build_object('commission_rate', NEW.commission_rate));
    END IF;
    IF OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan THEN
      INSERT INTO public.audit_logs (actor_id, actor_email, action, target_type, target_id, old_value, new_value)
      VALUES (auth.uid(), actor_email, 'plan.changed', 'center', NEW.id, jsonb_build_object('plan', OLD.subscription_plan), jsonb_build_object('plan', NEW.subscription_plan));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS centers_audit ON public.centers;
CREATE TRIGGER centers_audit AFTER UPDATE ON public.centers FOR EACH ROW EXECUTE FUNCTION public.log_center_change();

CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE actor_email text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT email INTO actor_email FROM public.profiles WHERE id = auth.uid();
    INSERT INTO public.audit_logs (actor_id, actor_email, action, target_type, target_id, old_value, new_value)
    VALUES (auth.uid(), actor_email, 'booking.status_changed', 'booking', NEW.id, jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS bookings_audit ON public.bookings;
CREATE TRIGGER bookings_audit AFTER UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();