
CREATE OR REPLACE FUNCTION public.calc_booking_commission()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.commission_amount := ROUND((NEW.price_paid * NEW.commission_rate / 100)::numeric, 2);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_center_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c_id uuid;
BEGIN
  c_id := COALESCE(NEW.center_id, OLD.center_id);
  UPDATE public.centers
  SET rating_avg = COALESCE((SELECT AVG(rating)::float FROM public.reviews WHERE center_id = c_id), 0),
      rating_count = (SELECT COUNT(*) FROM public.reviews WHERE center_id = c_id)
  WHERE id = c_id;
  RETURN NULL;
END;
$$;

-- has_role is called in RLS policies, must remain executable by anon/authenticated.
-- handle_new_user runs only via auth trigger; revoke from API roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
