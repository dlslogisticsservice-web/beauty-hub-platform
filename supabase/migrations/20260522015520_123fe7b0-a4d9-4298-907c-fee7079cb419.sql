
-- Seed demo users with confirmed emails and bcrypt passwords
DO $$
DECLARE
  u RECORD;
  uid uuid;
  demo_users JSONB := '[
    {"email":"superadmin@beautyhub.app","password":"SuperAdmin@2025","name":"Super Admin","role":"super_admin"},
    {"email":"admin@beautyhub.app","password":"Admin@2025","name":"Admin User","role":"admin"},
    {"email":"owner.eg@beautyhub.app","password":"Owner@2025","name":"Owner Egypt","role":"center_owner"},
    {"email":"owner.sa@beautyhub.app","password":"Owner@2025","name":"Owner Saudi","role":"center_owner"},
    {"email":"customer1@beautyhub.app","password":"Customer@2025","name":"Demo Customer","role":"customer"}
  ]'::jsonb;
BEGIN
  FOR u IN SELECT * FROM jsonb_to_recordset(demo_users) AS x(email text, password text, name text, role text)
  LOOP
    -- Skip if exists
    SELECT id INTO uid FROM auth.users WHERE email = u.email;
    IF uid IS NULL THEN
      uid := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        u.email, crypt(u.password, gen_salt('bf')),
        now(), now(), now(),
        jsonb_build_object('provider','email','providers',ARRAY['email']),
        jsonb_build_object('full_name', u.name, 'role', u.role),
        false, '', '', '', ''
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
      VALUES (gen_random_uuid(), uid, jsonb_build_object('sub', uid::text, 'email', u.email), 'email', uid::text, now(), now(), now());
    ELSE
      UPDATE auth.users
      SET encrypted_password = crypt(u.password, gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now(),
          raw_user_meta_data = jsonb_build_object('full_name', u.name, 'role', u.role)
      WHERE id = uid;
    END IF;

    -- Profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (uid, u.email, u.name)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

    -- Role
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, u.role::public.app_role);
  END LOOP;
END $$;
